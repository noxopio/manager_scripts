#!/usr/bin/env node
// Panel web local para mfs (Manager Repo).
// Sin dependencias externas: solo módulos nativos de Node.
// No reimplementa la lógica de git/npm: por cada repo lanza el mismo manager_repo.sh
// con MFS_ONLY=<repo>, de modo que el trabajo sigue en paralelo y con el mismo rendimiento.
//
// Uso:  mfs ui [lista.txt] [--port 4777] [--no-open]
//       (se ejecuta en el directorio donde están los repos y el listRep.txt)
//       Sin --port usa el primer puerto libre desde 4777; con --port usa exactamente ese.

'use strict';

const http = require('http');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawn, execFile } = require('child_process');

// ── Configuración ───────────────────────────────────────────────────────────
const args = process.argv.slice(2);
const argValue = (name, def) => {
  const i = args.indexOf(name);
  return i >= 0 && args[i + 1] ? args[i + 1] : def;
};
// --port (o MFS_UI_PORT) fuerza un puerto concreto; si no, se busca el primero libre desde 4777.
const PORT_EXPLICIT = args.includes('--port') || !!process.env.MFS_UI_PORT;
const BASE_PORT = parseInt(argValue('--port', process.env.MFS_UI_PORT || '4777'), 10);
const PORT_TRIES = PORT_EXPLICIT ? 1 : 20;
let PORT = BASE_PORT;
const OPEN_BROWSER = !args.includes('--no-open');
// Primer argumento posicional = lista inicial (igual que "mfs run otra/lista.txt")
const DEFAULT_LIST = args.find((a, i) => !a.startsWith('--') && args[i - 1] !== '--port') || 'listRep.txt';
const HOST = '127.0.0.1';
const IS_WIN = process.platform === 'win32';
const WORK_DIR = process.cwd();
const BASH = process.env.MFS_BASH || 'bash';
// Los scripts usan utilidades de Git Bash (dirname, ps, sed…). Si el panel se lanzó fuera de Git Bash,
// el PATH no las incluye: se añade la carpeta de bash.exe al PATH de los procesos hijos.
const CHILD_PATH = path.isAbsolute(BASH)
  ? [path.dirname(BASH), process.env.PATH || process.env.Path || ''].join(path.delimiter)
  : (process.env.PATH || process.env.Path || '');
function childEnv(extra = {}) {
  const env = { ...process.env, ...extra };
  delete env.Path; // en Windows puede venir como "Path"; se unifica en PATH
  env.PATH = CHILD_PATH;
  // Las lecturas de git (status…) no toman index.lock "opcional": si se cortan, no dejan bloqueos.
  // No afecta a los bloqueos obligatorios de commit/pull/checkout.
  env.GIT_OPTIONAL_LOCKS = '0';
  return env;
}
const toPosix = (p) => p.replace(/\\/g, '/');
const SCRIPT = toPosix(path.join(__dirname, '..', 'manager_repo.sh'));
const ACTIONS = new Set(['pull', 'install', 'updeps', 'run', 'status', 'commit', 'push', 'checkout', 'newbranch']);
const BRANCH_ACTIONS = new Set(['pull', 'checkout', 'newbranch']);
const BRANCH_RE = /^[\w./-]{1,200}$/;
// Comando de install: flags normales sí; encadenar comandos o expansiones de shell no.
const INSTALL_CMD_RE = /^[^;&|<>`$\r\n]{1,200}$/;
const MAX_LOG_LINES = 2000;
const VERSION = (() => { try { return fs.readFileSync(path.join(__dirname, '..', 'VERSION'), 'utf8').trim(); } catch { return 'desconocida'; } })();
// Datos de la instalación para el panel de información (franja LAUNCH PAD)
// El instalador escribe "# Fecha de instalación: AAAA-MM-DD HH:MM:SS" en la cabecera de manager_repo.sh.
function readInstallDate(text) {
  const m = /^# Fecha de instalación: (.+)$/m.exec(String(text || ''));
  return m ? m[1].trim() : null;
}
const INSTALL_DIR = path.resolve(__dirname, '..');
const INSTALL_INFO = (() => {
  const read = (f) => { try { return fs.readFileSync(path.join(INSTALL_DIR, f), 'utf8'); } catch { return ''; } };
  return {
    installDate: readInstallDate(read('manager_repo.sh').split('\n').slice(0, 10).join('\n')),
    sourceDir: read('.source').trim() || null,
  };
})();
const STARTED_AT = new Date().toISOString();
// Último log de cada repo, para poder verlo tras cerrar y reabrir el panel.
const LOGS_DIR = path.join(os.homedir(), '.mfs_ui', 'logs');
const logFile = (name) => path.join(LOGS_DIR, `${name.replace(/[^\w.-]/g, '_')}.log`);

// true si file está dentro de root (o es root).
function isInside(root, file) {
  const rel = path.relative(path.resolve(root), path.resolve(file));
  return rel === '' || (!!rel && !rel.startsWith('..') && !path.isAbsolute(rel));
}

function isValidGitBranchName(name) {
  return new Promise((resolve) => {
    execFile('git', ['check-ref-format', '--branch', name], { windowsHide: true }, (err) => resolve(!err));
  });
}

// ── Registro de paneles abiertos (para que "Matar todos" no mate otros paneles) ──
const PANELS_DIR = path.join(os.homedir(), '.mfs_ui', 'panels');
const PANEL_FILE = path.join(PANELS_DIR, `${process.pid}.json`);

function registerPanel() {
  try {
    fs.mkdirSync(PANELS_DIR, { recursive: true });
    fs.writeFileSync(PANEL_FILE, JSON.stringify({ pid: process.pid, port: PORT, workDir: process.cwd(), startedAt: new Date().toISOString() }));
  } catch (e) { console.error('[WARNING] No se pudo registrar el panel:', e.message); }
}
function unregisterPanel() { try { fs.unlinkSync(PANEL_FILE); } catch {} }

// Devuelve Map<pid, info> de los paneles vivos; borra los registros de paneles que ya no existen.
function readPanels(aliveProcs) {
  const alive = new Set(aliveProcs.map((p) => p.pid));
  const panels = new Map();
  let files = [];
  try { files = fs.readdirSync(PANELS_DIR).filter((f) => f.endsWith('.json')); } catch { return panels; }
  for (const f of files) {
    const file = path.join(PANELS_DIR, f);
    try {
      const info = JSON.parse(fs.readFileSync(file, 'utf8'));
      if (alive.has(info.pid)) panels.set(info.pid, info);
      else fs.unlinkSync(file);
    } catch { try { fs.unlinkSync(file); } catch {} }
  }
  return panels;
}

// ── Estado ──────────────────────────────────────────────────────────────────
/** @type {Map<string, {child: any, action: string, status: string, log: string[], port: number|null, stopping: boolean}>} */
const jobs = new Map();
const sseClients = new Set();
// Token git: SOLO en memoria mientras el panel está abierto (nunca se escribe en disco ni se devuelve).
let gitToken = '';

// ── Utilidades ──────────────────────────────────────────────────────────────
const stripAnsi = (s) => s.replace(/\x1b\[[0-9;?]*[A-Za-z]/g, '');
const stripCreds = (url) => url.replace(/\/\/[^@/]+@/, '//');

// Acepta rutas relativas al directorio de trabajo, absolutas de Windows (C:\...) y de Git Bash (/c/...).
function normalizePath(p) {
  let name = String(p || '').trim();
  if (IS_WIN) {
    name = name.replace(/^\/([a-zA-Z])(\/|$)/, (_, d) => d.toUpperCase() + ':/').replace(/^([a-zA-Z]):$/, (_, d) => d.toUpperCase() + ':/');
  }
  return path.resolve(WORK_DIR, name);
}

function resolveListPath(list) {
  const name = (list || DEFAULT_LIST).trim();
  if (!name.toLowerCase().endsWith('.txt')) throw new Error('La lista debe ser un archivo .txt');
  return normalizePath(name);
}

// ── Explorador / buscador de listas .txt ────────────────────────────────────
const SKIP_DIRS = new Set(['node_modules', '.git']);
const skipDir = (name) => SKIP_DIRS.has(name) || name.startsWith('.') || name.startsWith('$');
let drivesCache = null;
function getDrives() {
  if (!IS_WIN) return [];
  if (!drivesCache) {
    drivesCache = [];
    for (let c = 65; c <= 90; c++) {
      const d = String.fromCharCode(c) + ':\\';
      try { fs.accessSync(d); drivesCache.push(d); } catch {}
    }
  }
  return drivesCache;
}

function listDir(dirArg) {
  const dir = dirArg ? normalizePath(dirArg) : WORK_DIR;
  let dirents;
  try { dirents = fs.readdirSync(dir, { withFileTypes: true }); }
  catch (e) { throw new Error(e.code === 'EPERM' || e.code === 'EACCES' ? `Sin permiso para leer ${dir}` : `No se puede abrir ${dir}`); }
  const entries = [];
  for (const d of dirents) {
    if (d.isDirectory() && !skipDir(d.name)) entries.push({ name: d.name, type: 'dir' });
    else if (d.isFile() && d.name.toLowerCase().endsWith('.txt')) entries.push({ name: d.name, type: 'txt' });
  }
  const cmp = (a, b) => (a.type === b.type ? a.name.localeCompare(b.name, 'es', { sensitivity: 'base' }) : a.type === 'dir' ? -1 : 1);
  entries.sort(cmp);
  const parent = path.dirname(dir);
  return { dir, parent: parent === dir ? null : parent, sep: path.sep, drives: getDrives(), entries };
}

function searchTxt(dirArg, q) {
  const root = dirArg ? normalizePath(dirArg) : WORK_DIR;
  const needle = String(q || '').toLowerCase();
  const results = [];
  let visited = 0;
  let truncated = false;
  const stack = [[root, 0]];
  while (stack.length) {
    const [dir, depth] = stack.pop();
    let dirents;
    try { dirents = fs.readdirSync(dir, { withFileTypes: true }); } catch { continue; }
    for (const d of dirents) {
      if (++visited > 20000 || results.length >= 200) { truncated = true; break; }
      if (d.isDirectory()) { if (depth < 6 && !skipDir(d.name)) stack.push([path.join(dir, d.name), depth + 1]); }
      else if (d.isFile() && d.name.toLowerCase().endsWith('.txt') && d.name.toLowerCase().includes(needle)) results.push(path.join(dir, d.name));
    }
    if (truncated) break;
  }
  results.sort();
  return { root, results, truncated };
}

// Mismas reglas que manager_repo.sh (bucle "while read line").
function parseList(content) {
  const repos = [];
  let group = null; // "## Nombre" abre un grupo para los repos de debajo (la terminal lo ignora como comentario)
  for (const raw of content.split(/\r?\n/)) {
    const line = raw.trim();
    const header = !line.includes('#EXCLUDE') && line.match(/^##\s+(.+)$/);
    if (header) { group = header[1].trim(); continue; }
    // Directivas del panel bajo un repo ("#> health: /health"); para bash son comentarios
    const directive = line.match(/^#>\s*([\w-]+)\s*:\s*(.+)$/);
    if (directive) {
      const prev = repos[repos.length - 1];
      if (prev && directive[1].toLowerCase() === 'health') prev.health = directive[2].trim();
      continue;
    }
    if (!line || line.includes('#EXCLUDE') || line.startsWith('#')) continue;
    const tokens = line.split(/\s+/);
    const url = tokens[0];
    const last = tokens[tokens.length - 1];
    const isNew = tokens.length > 1 && last.includes('#NEW');
    const cmdTokens = isNew ? tokens.slice(1, -1) : tokens.slice(1);
    const command = cmdTokens.join(' ') || 'npm run start';
    // Igual que en bash: `basename "$repo_url" .git` (nombre de la carpeta que crea git clone)
    const name = url.replace(/\/+$/, '').split('/').pop().replace(/\.git$/, '');
    repos.push({ name, url: stripCreds(url), command, isNew, group });
  }
  return repos;
}

function readRepos(list) {
  const file = resolveListPath(list);
  if (!fs.existsSync(file)) return { file, repos: [], missing: true };
  return { file, repos: parseList(fs.readFileSync(file, 'utf8')), missing: false };
}

// Limita cuántos git status corren a la vez (con 20+ repos, lanzarlos todos juntos satura el equipo).
const GIT_CONCURRENCY = 6;
let gitActive = 0;
const gitQueue = [];
function withGitSlot(fn) {
  return new Promise((resolve) => {
    const run = () => {
      gitActive++;
      fn().then(resolve, () => resolve(undefined)).finally(() => {
        gitActive--;
        if (gitQueue.length) gitQueue.shift()();
      });
    };
    if (gitActive < GIT_CONCURRENCY) run(); else gitQueue.push(run);
  });
}

// Una sola llamada a git por repo: rama, upstream, ahead/behind y número de archivos cambiados.
// --no-optional-locks: lee el estado SIN tomar .git/index.lock (como hace VS Code), así no choca con
// otros git ni deja un lock abandonado si se corta.
function gitInfo(dir) {
  return withGitSlot(() => new Promise((resolve) => {
    execFile('git', ['--no-optional-locks', '-C', dir, 'status', '--porcelain', '-b'], { timeout: 15000, windowsHide: true, env: childEnv() }, (err, out) => {
      if (err) return resolve({ branch: null, upstream: null, ahead: 0, behind: 0, changes: 0 });
      const lines = out.split(/\r?\n/).filter(Boolean);
      const head = (lines[0] || '').replace(/^## /, '');
      const info = { branch: null, upstream: null, ahead: 0, behind: 0, changes: lines.length - 1 };
      let m;
      if ((m = head.match(/^No commits yet on (\S+)/))) info.branch = m[1];
      else if (head.startsWith('HEAD (no branch)')) info.branch = 'HEAD (sin rama)';
      else if ((m = head.match(/^(.+?)(?:\.\.\.(\S+))?(?: \[(.+)\])?$/))) {
        info.branch = m[1];
        info.upstream = m[2] || null;
        const a = (m[3] || '').match(/ahead (\d+)/);
        const b = (m[3] || '').match(/behind (\d+)/);
        info.ahead = a ? Number(a[1]) : 0;
        info.behind = b ? Number(b[1]) : 0;
      }
      resolve(info);
    });
  }));
}

// Resumen de lo que entraría en un commit: archivos (status --porcelain) y líneas (diff --stat HEAD).
function gitDiffStat(dir) {
  const run = (gitArgs) => new Promise((resolve) => {
    execFile('git', ['--no-optional-locks', '-C', dir, ...gitArgs], { timeout: 15000, windowsHide: true, env: childEnv(), maxBuffer: 4e6 },
      (err, out) => resolve(err ? '' : out.replace(/\s+$/, '')));
  });
  return withGitSlot(async () => {
    const files = await run(['-c', 'color.status=false', 'status', '--porcelain']);
    const stat = files ? await run(['diff', '--stat', 'HEAD']) : '';
    return { files: files ? files.split(/\r?\n/) : [], stat };
  });
}

// Bloqueo de git abandonado (.git/index.lock): devuelve su antigüedad en segundos, o null si no hay.
function lockAge(dir) {
  try { return Math.round((Date.now() - fs.statSync(path.join(dir, '.git', 'index.lock')).mtimeMs) / 1000); }
  catch { return null; }
}

function gitRunning() {
  return new Promise((resolve) => {
    if (!IS_WIN) {
      return execFile('ps', ['-A', '-o', 'comm='], (err, out) => resolve(!err && /(^|\/)git$/m.test(out)));
    }
    execFile('tasklist', ['/FI', 'IMAGENAME eq git.exe', '/FO', 'CSV', '/NH'], { windowsHide: true }, (err, out) =>
      resolve(!err && /"git\.exe"/i.test(out)));
  });
}

async function describeRepo(r) {
  const dir = fs.existsSync(path.join(WORK_DIR, r.name)) ? path.join(WORK_DIR, r.name) : null;
  const job = jobs.get(r.name);
  const git = dir ? await gitInfo(dir) : {};
  const lock = dir ? lockAge(dir) : null;
  return {
    ...r,
    cloned: !!dir,
    hasDeps: !!dir && fs.existsSync(path.join(dir, 'node_modules')),
    ...git,
    locked: lock !== null,
    lockAge: lock,
    status: job ? job.status : 'idle',
    action: job ? job.action : null,
    port: job ? job.port : null,
    compile: job ? job.compile : null,
    healthState: job ? job.healthState || null : null,
    startedAt: job ? job.startedAt || null : null,
    endedAt: job ? job.endedAt || null : null,
  };
}

function broadcast(event) {
  const data = `data: ${JSON.stringify(event)}\n\n`;
  for (const res of sseClients) res.write(data);
}

// Run: el puerto se anuncia ANTES de terminar de compilar, así que se sigue la compilación aparte.
// compile: 'compiling' (aún no listo) | 'ready' (compilado, se puede abrir) | 'failed' (compiló con errores)
// Incluye servidores Node sin empaquetador: Nest, Next ("Ready in 2s") y "listening on (port) 3000" (Express y similares).
// "listening on localhost:4200" (Angular, aún compilando) NO encaja: exige el número justo después.
const COMPILE_OK_RE = /compiled successfully|compiled with \d+ warnings?|Compiled successfully|Application bundle generation complete|ready in \d|webpack [\d.]+ compiled(?! with \d+ errors?)|Nest application successfully started|listening on (?:port )?:?\d{2,5}\b/i;
const COMPILE_FAIL_RE = /compiled with \d+ errors?|Failed to compile|webpack [\d.]+ compiled with \d+ errors?/i;
const PORT_RE = /(?:localhost|127\.0\.0\.1|0\.0\.0\.0|\[::1?\]):(\d{2,5})/;
// Si el log menciona un empaquetador, el puerto puede abrirse antes de terminar de compilar:
// entonces "listo" lo deciden solo los mensajes (COMPILE_OK_RE), no la comprobación por TCP.
const BUNDLER_RE = /webpack|vite|compil|bundl|angular|ng serve|rspack|esbuild|turbopack/i;
const READY_PROBE_MS = 1500;
const READY_PROBE_MAX_MS = 180000;

// ── Health check ("#> health: /health" bajo el repo en el .txt) ──
// URL a consultar: ruta relativa al puerto del repo, o URL completa. Pura, para los tests.
function healthUrl(health, port) {
  if (!health) return null;
  if (/^https?:\/\//i.test(health)) return health;
  if (!port) return null;
  return `http://localhost:${port}${health.startsWith('/') ? '' : '/'}${health}`;
}
const HEALTH_EVERY_MS = 15000;
const HEALTH_TIMEOUT_MS = 3000;
async function checkHealth(name) {
  const job = jobs.get(name);
  if (!job || job.status !== 'running' || !job.health) return;
  const url = healthUrl(job.health, job.port);
  if (!url) return;
  let state;
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(HEALTH_TIMEOUT_MS), redirect: 'follow' });
    state = { ok: res.ok, code: res.status, at: new Date().toISOString(), url };
  } catch (e) {
    state = { ok: false, code: null, error: e.name === 'TimeoutError' ? 'sin respuesta en 3 s' : 'no responde', at: new Date().toISOString(), url };
  }
  if (jobs.get(name) !== job || job.status !== 'running') return;
  const prev = job.healthState;
  job.healthState = state;
  if (!prev || prev.ok !== state.ok || prev.code !== state.code) broadcast(statusEvent(name));
}
setInterval(() => { for (const name of jobs.keys()) checkHealth(name); }, HEALTH_EVERY_MS).unref();

// Servidores que no anuncian que están listos: cuando el puerto acepta conexiones, pasa a 'ready'.
function probeReady(name) {
  const job = jobs.get(name);
  if (!job || job.readyProbe) return;
  job.readyProbe = true;
  const net = require('net');
  const started = Date.now();
  const alive = () => jobs.get(name) === job && job.status === 'running' && job.compile === 'compiling' && !job.bundler && job.port;
  const tick = () => {
    if (!alive() || Date.now() - started > READY_PROBE_MAX_MS) return;
    const sock = net.connect({ host: 'localhost', port: job.port });
    sock.setTimeout(1000);
    const done = (ok) => {
      sock.destroy();
      if (!alive()) return;
      if (ok) { job.compile = 'ready'; broadcast(statusEvent(name)); checkHealth(name); } else setTimeout(tick, READY_PROBE_MS);
    };
    sock.once('connect', () => done(true));
    sock.once('error', () => done(false));
    sock.once('timeout', () => done(false));
  };
  setTimeout(tick, READY_PROBE_MS);
}

function statusEvent(name) {
  const job = jobs.get(name);
  return {
    type: 'status', repo: name, status: job.status, action: job.action, port: job.port, compile: job.compile,
    healthState: job.healthState || null, startedAt: job.startedAt || null, endedAt: job.endedAt || null,
  };
}

function pushLog(name, text) {
  const job = jobs.get(name);
  if (!job) return;
  for (const piece of stripAnsi(text).split(/\r?\n|\r/)) {
    if (!piece.trim()) continue;
    job.log.push(piece);
    if (job.log.length > MAX_LOG_LINES) job.log.shift();
    if (job.action === 'run') {
      let changed = false;
      if (!job.bundler && BUNDLER_RE.test(piece)) job.bundler = true;
      if (!job.port) {
        const m = piece.match(PORT_RE);
        if (m) { job.port = parseInt(m[1], 10); changed = true; if (job.compile === 'compiling') probeReady(name); }
      }
      const compile = COMPILE_FAIL_RE.test(piece) ? 'failed' : COMPILE_OK_RE.test(piece) ? 'ready' : null;
      if (compile && compile !== job.compile) { job.compile = compile; changed = true; if (compile === 'ready') checkHealth(name); }
      if (changed && job.status === 'running') broadcast(statusEvent(name));
    }
    broadcast({ type: 'log', repo: name, line: piece });
  }
}

function setStatus(name, status) {
  const job = jobs.get(name);
  job.status = status;
  broadcast(statusEvent(name));
}

// Resuelve cuando ya nadie escucha en el puerto (o tras el tiempo máximo).
function waitPortFree(port, timeoutMs = 20000) {
  const net = require('net');
  const deadline = Date.now() + timeoutMs;
  return new Promise((resolve) => {
    const probe = () => {
      const sock = net.connect({ host: '127.0.0.1', port });
      sock.setTimeout(1000);
      const again = (free) => { sock.destroy(); if (free || Date.now() > deadline) resolve(free); else setTimeout(probe, 500); };
      sock.once('connect', () => again(false));
      sock.once('timeout', () => again(false));
      sock.once('error', () => again(true)); // ECONNREFUSED: puerto libre
    };
    probe();
  });
}

// ── Lotes: los repos lanzados en una misma acción; al terminar todos se envía un resumen ──
const batches = new Map();
let batchSeq = 0;
function createBatch(action, names, extra) {
  const id = ++batchSeq;
  batches.set(id, { action, extra, pending: new Set(names), ok: [], error: [] });
  return id;
}
function batchDone(id, name, status) {
  const b = batches.get(id);
  if (!b || !b.pending.delete(name)) return;
  if (status === 'ok') b.ok.push(name);
  else if (status === 'error') b.error.push(name); // los detenidos a mano no cuentan como fallo
  if (b.pending.size) return;
  batches.delete(id);
  broadcast({ type: 'batch', action: b.action, ok: b.ok, error: b.error, extra: b.extra });
}

function saveLog(name, job) {
  try {
    fs.mkdirSync(LOGS_DIR, { recursive: true });
    fs.writeFileSync(logFile(name), job.log.join('\n') + '\n', 'utf8');
  } catch (e) { console.error('[WARNING] No se pudo guardar el log de', name, e.message); }
}

function startJob(repo, action, list, { branch, baseBranch, installCmd, runCmd, commitMsg } = {}, batchId = null) {
  const existing = jobs.get(repo.name);
  if (existing && (existing.status === 'running' || existing.status === 'stopping')) return false;

  const scriptArgs = [SCRIPT];
  const opts = [];
  if (BRANCH_ACTIONS.has(action) && branch) opts.push('-b', branch);
  if (action === 'newbranch' && baseBranch) opts.push('-B', baseBranch);
  if ((action === 'install' || action === 'updeps') && installCmd) opts.push('-i', installCmd);
  if (action === 'run' && runCmd) opts.push('-r', runCmd);
  if (action === 'commit') opts.push('-m', commitMsg);
  scriptArgs.push(...opts, action, toPosix(list));

  const env = childEnv({ MFS_ONLY: repo.name, GIT_TERMINAL_PROMPT: '0' });
  if (gitToken) env.MFS_GIT_TOKEN = gitToken;
  const child = spawn(BASH, scriptArgs, {
    cwd: WORK_DIR,
    env,
    detached: !IS_WIN, // en Unix: grupo de procesos propio para poder matar el árbol
    windowsHide: true,
  });
  jobs.set(repo.name, {
    child, action, status: 'running', log: [], port: null, stopping: false,
    compile: action === 'run' && !repo.isNew ? 'compiling' : null,
    closed: false, killDone: false, batchId,
    health: action === 'run' ? repo.health || null : null, healthState: null, // "#> health:" del .txt
    startedAt: new Date().toISOString(), endedAt: null, // tiempo en la tarjeta ("arriba 1 h", "pull ok en 8 s")
  });
  setStatus(repo.name, 'running');
  const shown = opts.map((o, i) => (i % 2 ? `"${o}"` : o)).join(' ');
  pushLog(repo.name, `$ mfs ${shown ? shown + ' ' : ''}${action}  (${repo.name})`);
  if (action === 'run' && repo.isNew) pushLog(repo.name, 'Este repo usa #NEW: se abre en una ventana externa; su log no aparece aquí.');

  child.stdout.on('data', (d) => pushLog(repo.name, d.toString()));
  child.stderr.on('data', (d) => pushLog(repo.name, d.toString()));
  child.on('error', (err) => {
    pushLog(repo.name, `[ERROR] No se pudo ejecutar "${BASH}": ${err.message}. Define MFS_BASH con la ruta a bash.exe.`);
    const failed = jobs.get(repo.name);
    if (failed && failed.child === child) failed.endedAt = new Date().toISOString();
    setStatus(repo.name, 'error');
    if (batchId) batchDone(batchId, repo.name, 'error');
  });
  child.on('close', (code) => {
    const job = jobs.get(repo.name);
    if (!job || job.child !== child) return;
    job.closed = true;
    job.endedAt = new Date().toISOString();
    pushLog(repo.name, `── proceso terminado (código ${code}) ──`);
    saveLog(repo.name, job);
    if (job.stopping) finishStop(repo.name); // "detenido" solo cuando además el puerto quede libre
    else setStatus(repo.name, code === 0 ? 'ok' : 'error');
    if (batchId) batchDone(batchId, repo.name, job.stopping ? 'stopped' : code === 0 ? 'ok' : 'error');
  });
  return true;
}

// En Git Bash (MSYS) los subshells "( ... ) &" se crean con fork y no conservan un padre
// Windows válido, así que "taskkill /T" desde el bash raíz no alcanza a npm/node.
// MSYS sí conserva el grupo de procesos: buscamos el PGID del bash lanzado (por su WINPID),
// recogemos los WINPID de todo ese grupo y matamos cada árbol nativo con taskkill /T.
function killWindowsTree(pid, done) {
  execFile(BASH, ['-c', 'ps'], { timeout: 10000, windowsHide: true, env: childEnv() }, (err, out) => {
    const winpids = new Set([String(pid)]);
    if (!err) {
      const rows = out.split(/\r?\n/).slice(1).map((l) => l.trim().split(/\s+/)).filter((c) => c.length >= 4);
      const root = rows.find((c) => c[3] === String(pid));
      if (root) for (const c of rows) if (c[2] === root[2]) winpids.add(c[3]);
    }
    const taskArgs = ['/T', '/F'];
    for (const w of winpids) taskArgs.push('/PID', w);
    execFile('taskkill', taskArgs, { windowsHide: true }, () => done && done());
  });
}

// Marca "detenido" cuando el bash terminó, el kill acabó y (si había puerto) el puerto ya está libre.
async function finishStop(name) {
  const job = jobs.get(name);
  if (!job || !job.stopping || !job.closed || !job.killDone || job.status === 'stopped') return;
  if (job.port && !job.portChecked) {
    job.portChecked = true;
    const free = await waitPortFree(job.port);
    if (!free) pushLog(name, `── aviso: el puerto ${job.port} sigue ocupado; revisa "Procesos Node" ──`);
  }
  if (jobs.get(name) === job && job.status !== 'stopped') {
    pushLog(name, '── detenido ──');
    setStatus(name, 'stopped');
  }
}

function stopJob(name) {
  const job = jobs.get(name);
  if (!job || job.status !== 'running') return false;
  job.stopping = true;
  const pid = job.child.pid;
  setStatus(name, 'stopping');
  pushLog(name, '── deteniendo... ──');
  const onKilled = () => { job.killDone = true; finishStop(name); };
  if (IS_WIN) {
    killWindowsTree(pid, onKilled);
  } else {
    try { process.kill(-pid, 'SIGTERM'); } catch { try { job.child.kill('SIGTERM'); } catch {} }
    onKilled();
  }
  return true;
}

function stopAll() {
  let n = 0;
  for (const name of jobs.keys()) if (stopJob(name)) n++;
  return n;
}

// ── Equivalentes de "mfs ps" / "mfs kill" (sin matar el propio panel) ─────────
function listNodeProcesses() {
  return new Promise((resolve) => {
    if (IS_WIN) {
      execFile('tasklist', ['/FI', 'IMAGENAME eq node.exe', '/FO', 'CSV', '/NH'], { windowsHide: true }, (err, out) => {
        if (err) return resolve([]);
        const rows = out.split(/\r?\n/).filter((l) => l.startsWith('"')).map((l) => l.slice(1, -1).split('","'));
        resolve(rows.map((c) => ({ pid: Number(c[1]), memory: c[4], self: Number(c[1]) === process.pid })));
      });
    } else {
      execFile('ps', ['-A', '-o', 'pid=,rss=,args='], (err, out) => {
        if (err) return resolve([]);
        resolve(out.split('\n').map((l) => l.trim().match(/^(\d+)\s+(\d+)\s+(.*)$/)).filter((m) => m && /(^|\/)node(\s|$)/.test(m[3]))
          .map((m) => ({ pid: Number(m[1]), memory: `${Math.round(m[2] / 1024)} MB`, command: m[3].slice(0, 120), self: Number(m[1]) === process.pid })));
      });
    }
  });
}

// Procesos node con la marca de panel (este panel u otro panel mfs abierto).
async function listNodeWithPanels() {
  const procs = await listNodeProcesses();
  const panels = readPanels(procs);
  return procs.map((p) => ({ ...p, panel: panels.get(p.pid) || null }));
}

// Mata los procesos node indicados (elegidos en la lista "Procesos Node"), nunca este panel
// ni otros paneles mfs abiertos: solo se aceptan PIDs que siguen vivos en la lista actual.
async function killNode(pids) {
  const wanted = new Set(pids.map(Number));
  const targets = (await listNodeWithPanels()).filter((p) => wanted.has(p.pid) && !p.self && !p.panel);
  if (IS_WIN) {
    for (let i = 0; i < targets.length; i += 50) {
      const taskArgs = ['/F'];
      for (const p of targets.slice(i, i + 50)) taskArgs.push('/PID', String(p.pid));
      await new Promise((r) => execFile('taskkill', taskArgs, { windowsHide: true }, () => r()));
    }
  } else {
    for (const p of targets) { try { process.kill(p.pid, 'SIGTERM'); } catch {} }
  }
  return targets.length;
}

// ── Equivalente de "mfs list": repos de una organización/usuario de GitHub ────
async function fetchGithubRepos(owner, token) {
  if (!/^[\w.-]{1,100}$/.test(owner)) throw new Error('Nombre de organización no válido');
  const headers = { 'User-Agent': 'mfs-ui', Accept: 'application/vnd.github+json' };
  if (token) headers.Authorization = `token ${token}`;
  for (const kind of ['orgs', 'users']) {
    const urls = [];
    let ok = true;
    for (let page = 1; page <= 50; page++) {
      const res = await fetch(`https://api.github.com/${kind}/${owner}/repos?per_page=100&page=${page}`, { headers });
      if (res.status === 404) { ok = false; break; }
      if (!res.ok) throw new Error(`GitHub respondió ${res.status}: ${(await res.text()).slice(0, 200)}`);
      const items = await res.json();
      urls.push(...items.map((r) => r.html_url));
      if (items.length < 100) break;
    }
    if (ok) return [...new Set(urls)].sort();
  }
  throw new Error(`No se encontró la organización o usuario "${owner}" (o el token no tiene permisos).`);
}

// ── cURL (Herramientas → cURL) ──────────────────────────────────────────────
// Se ejecuta el binario curl sin shell: el comando pegado se separa en argumentos aquí.

// Separa una línea como lo haría bash: '…' literal, "…" con escapes, $'…' (estilo ANSI-C) y \ fuera de comillas.
function splitShell(src) {
  const out = [];
  let cur = '', has = false, i = 0;
  const unclosed = () => new Error('Hay comillas sin cerrar en el comando');
  while (i < src.length) {
    const c = src[i];
    if (/\s/.test(c)) { if (has) { out.push(cur); cur = ''; has = false; } i++; continue; }
    has = true;
    if (c === "'") {
      const j = src.indexOf("'", i + 1);
      if (j < 0) throw unclosed();
      cur += src.slice(i + 1, j); i = j + 1; continue;
    }
    if (c === '$' && src[i + 1] === "'") {
      i += 2;
      while (i < src.length && src[i] !== "'") {
        if (src[i] === '\\' && i + 1 < src.length) {
          const n = src[i + 1];
          const hex = n === 'x' ? /^[0-9a-fA-F]{1,2}/.exec(src.slice(i + 2)) : n === 'u' ? /^[0-9a-fA-F]{1,4}/.exec(src.slice(i + 2)) : null;
          if (hex) { cur += String.fromCharCode(parseInt(hex[0], 16)); i += 2 + hex[0].length; continue; }
          cur += { n: '\n', t: '\t', r: '\r', '\\': '\\', "'": "'", '"': '"' }[n] ?? '\\' + n;
          i += 2;
        } else cur += src[i++];
      }
      if (i >= src.length) throw unclosed();
      i++; continue;
    }
    if (c === '"') {
      i++;
      while (i < src.length && src[i] !== '"') {
        if (src[i] === '\\' && '"\\$`'.includes(src[i + 1])) { cur += src[i + 1]; i += 2; } else cur += src[i++];
      }
      if (i >= src.length) throw unclosed();
      i++; continue;
    }
    if (c === '\\' && i + 1 < src.length) { cur += src[i + 1]; i += 2; continue; }
    cur += c; i++;
  }
  if (has) out.push(cur);
  return out;
}

// Opciones cortas sin argumento (el resto de letras toman valor: -X POST, -H …, -d …)
const CURL_NOARG = new Set('#0123456:fgGiIjklLnNpqRsSvVZ'.split(''));
const CURL_DROP_SHORT = new Set(['s', 'S', 'i', '#']); // el panel pone su propia salida
const CURL_BLOCK_SHORT = new Set(['o', 'O', 'D', 'c', 'K']);
const CURL_BLOCK_LONG = new Set(['--output', '--remote-name', '--remote-name-all', '--output-dir', '--dump-header', '--cookie-jar', '--trace', '--trace-ascii', '--libcurl', '--config']);
const CURL_DROP_LONG = new Set(['--include', '--silent', '--show-error', '--progress-bar', '--no-progress-meter']);
const curlBlocked = (opt) => new Error(`La opción ${opt} no se admite en el panel (escribe archivos o cambia la salida que el panel necesita leer)`);

// Convierte el texto pegado (bash, cmd de Chrome con ^, PowerShell con `) en los argumentos para curl.
function parseCurl(command) {
  let src = String(command || '').trim();
  if (!src) throw new Error('Pega un comando curl');
  src = src.replace(/[\\^`][ \t]*\r?\n/g, ' '); // continuaciones de línea
  if (/\^"/.test(src)) src = src.replace(/\^([\s\S])/g, '$1'); // "Copiar como cURL (cmd)"
  const tokens = splitShell(src);
  if (/^curl(\.exe)?$/i.test(tokens[0] || '')) tokens.shift();
  const args = [];
  let maxTime = null;
  for (let i = 0; i < tokens.length; i++) {
    const t = tokens[i];
    if (t.startsWith('--') && t.length > 2) {
      const [name, inline] = t.split(/=(.*)/s);
      if (CURL_BLOCK_LONG.has(name)) throw curlBlocked(name);
      if (CURL_DROP_LONG.has(name)) continue;
      if (name === '--write-out') { if (inline === undefined) i++; continue; }
      if (name === '--max-time') maxTime = Number(inline ?? tokens[i + 1]);
      args.push(t);
      continue;
    }
    if (/^-[^-]/.test(t)) {
      let kept = '';
      for (let k = 1; k < t.length; k++) {
        const L = t[k];
        if (CURL_BLOCK_SHORT.has(L)) throw curlBlocked('-' + L);
        if (CURL_NOARG.has(L)) { if (!CURL_DROP_SHORT.has(L)) kept += L; continue; }
        // Opción con valor: el resto del token o el siguiente
        let value = t.slice(k + 1);
        if (!value) {
          if (i + 1 >= tokens.length) throw new Error(`Falta el valor de -${L}`);
          value = tokens[++i];
        }
        if (kept) { args.push('-' + kept); kept = ''; }
        if (L !== 'w') { args.push('-' + L, value); if (L === 'm') maxTime = Number(value); }
        break;
      }
      if (kept) args.push('-' + kept);
      continue;
    }
    args.push(t);
  }
  if (!args.some((a) => /^https?:\/\//i.test(a))) throw new Error('El comando no tiene una URL http:// o https://');
  const timeoutMs = Number.isFinite(maxTime) && maxTime > 0 ? Math.min(maxTime, 600) * 1000 + 2000 : 60000;
  return { args, timeoutMs };
}

const CURL_MARK = '__MFS_CURL__';
// Salida de curl -D - … -w: bloques de cabeceras (uno por redirección / 100 Continue / proxy), cuerpo y métricas.
function parseCurlOutput(text) {
  const idx = text.lastIndexOf('\n' + CURL_MARK);
  let rest = idx >= 0 ? text.slice(0, idx) : text;
  const metrics = idx >= 0 ? text.slice(idx + CURL_MARK.length + 1).trim() : '';
  let headers = [], statusLine = '';
  while (/^HTTP\/[\d.]+ \d{3}/.test(rest)) {
    const m = /\r?\n\r?\n/.exec(rest);
    const block = m ? rest.slice(0, m.index) : rest;
    rest = m ? rest.slice(m.index + m[0].length) : '';
    const lines = block.split(/\r?\n/);
    statusLine = lines[0];
    headers = lines.slice(1).map((l) => { const c = l.indexOf(':'); return [l.slice(0, c).trim(), l.slice(c + 1).trim()]; }).filter(([k]) => k);
  }
  const [code, time, size, ...ct] = metrics.split(' ');
  return {
    status: Number(code) || Number((/ (\d{3})/.exec(statusLine) || [])[1]) || 0,
    statusLine,
    timeMs: time ? Math.round(Number(time) * 1000) : null,
    size: size ? Number(size) : Buffer.byteLength(rest),
    contentType: ct.join(' '),
    headers,
    body: rest,
  };
}

function runCurl(args, timeoutMs = 60000) {
  return new Promise((resolve, reject) => {
    const full = [...args, '-sS', '-D', '-', '-w', `\\n${CURL_MARK}%{http_code} %{time_total} %{size_download} %{content_type}`];
    execFile('curl', full, { windowsHide: true, timeout: timeoutMs, maxBuffer: 10e6, encoding: 'buffer', env: childEnv() }, (err, stdout, stderr) => {
      if (err && err.code === 'ENOENT') return reject(new Error('No se encuentra curl en el PATH'));
      const truncated = !!err && err.code === 'ERR_CHILD_PROCESS_STDIO_MAXBUFFER';
      const out = parseCurlOutput(Buffer.from(stdout || '').toString('utf8'));
      resolve({
        ...out,
        truncated,
        timedOut: !!err && err.killed && !truncated,
        exitCode: err ? (typeof err.code === 'number' ? err.code : null) : 0,
        stderr: Buffer.from(stderr || '').toString('utf8').trim(),
      });
    });
  });
}

// ── HTTP ────────────────────────────────────────────────────────────────────
function send(res, code, body, type = 'application/json; charset=utf-8') {
  res.writeHead(code, { 'Content-Type': type, 'Cache-Control': 'no-store' });
  res.end(typeof body === 'string' ? body : JSON.stringify(body));
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', (c) => {
      data += c;
      if (data.length > 2e6) { reject(new Error('Cuerpo demasiado grande')); req.destroy(); }
    });
    req.on('end', () => {
      try { resolve(data ? JSON.parse(data) : {}); } catch (e) { reject(e); }
    });
  });
}

// Estáticos del panel: solo /css/*.css y /js/*.js dentro de esta carpeta. Devuelve { file, type } o null.
const STATIC_TYPES = { '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8' };
function staticFile(pathname, root = __dirname) {
  const m = /^\/(css|js)\/[\w.-]+$/.exec(pathname);
  if (!m) return null;
  const ext = path.extname(pathname).toLowerCase();
  if ((m[1] === 'css' && ext !== '.css') || (m[1] === 'js' && ext !== '.js')) return null;
  const file = path.join(root, pathname);
  if (!isInside(path.join(root, m[1]), file)) return null;
  return { file, type: STATIC_TYPES[ext] };
}

// Protección básica: solo peticiones al propio host local (evita DNS rebinding)
// y las que modifican estado deben llevar la cabecera X-MFS (bloquea CSRF de otras webs).
function allowed(req) {
  const host = req.headers.host || '';
  if (host !== `${HOST}:${PORT}` && host !== `localhost:${PORT}`) return false;
  if (req.method !== 'GET' && req.headers['x-mfs'] !== '1') return false;
  return true;
}

const server = http.createServer(async (req, res) => {
  if (!allowed(req)) return send(res, 403, { error: 'Prohibido' });
  const url = new URL(req.url, `http://${req.headers.host}`);
  const p = url.pathname;

  try {
    if (req.method === 'GET' && (p === '/' || p === '/index.html')) {
      return send(res, 200, fs.readFileSync(path.join(__dirname, 'index.html'), 'utf8'), 'text/html; charset=utf-8');
    }

    if (req.method === 'GET' && (p.startsWith('/css/') || p.startsWith('/js/'))) {
      const st = staticFile(p);
      if (!st || !fs.existsSync(st.file)) return send(res, 404, { error: 'No encontrado' });
      return send(res, 200, fs.readFileSync(st.file, 'utf8'), st.type);
    }

    if (req.method === 'GET' && p === '/api/info') {
      return send(res, 200, {
        workDir: WORK_DIR, script: SCRIPT, bash: BASH, defaultList: DEFAULT_LIST, hasToken: !!gitToken, version: VERSION,
        installDir: INSTALL_DIR, ...INSTALL_INFO, startedAt: STARTED_AT, port: PORT, node: process.version, platform: process.platform,
      });
    }

    if (req.method === 'POST' && p === '/api/token') {
      const body = await readBody(req);
      const token = String(body.token || '').trim();
      if (/[\r\n\s]/.test(token) || token.length > 500) return send(res, 400, { error: 'Token no válido' });
      gitToken = token;
      return send(res, 200, { hasToken: !!gitToken });
    }

    if (req.method === 'GET' && p === '/api/lists') {
      const files = fs.readdirSync(WORK_DIR).filter((f) => f.toLowerCase().endsWith('.txt'));
      return send(res, 200, { files });
    }

    if (req.method === 'GET' && p === '/api/fs/list') {
      return send(res, 200, listDir(url.searchParams.get('dir')));
    }

    if (req.method === 'GET' && p === '/api/fs/search') {
      return send(res, 200, searchTxt(url.searchParams.get('dir'), url.searchParams.get('q')));
    }

    if (req.method === 'GET' && p === '/api/ps') {
      return send(res, 200, { processes: await listNodeWithPanels() });
    }

    if (req.method === 'POST' && p === '/api/kill-node') {
      const body = await readBody(req);
      if (!Array.isArray(body.pids) || !body.pids.length) return send(res, 400, { error: 'Selecciona al menos un proceso' });
      return send(res, 200, { killed: await killNode(body.pids) });
    }

    if (req.method === 'POST' && p === '/api/github') {
      const body = await readBody(req);
      const urls = await fetchGithubRepos(String(body.org || '').trim(), String(body.token || '').trim() || gitToken);
      return send(res, 200, { urls });
    }

    if (req.method === 'GET' && p === '/api/readme') {
      const file = ['readme.md', 'README.md'].map((f) => path.join(__dirname, '..', f)).find((f) => fs.existsSync(f));
      return send(res, 200, { content: file ? fs.readFileSync(file, 'utf8') : 'README no encontrado.' });
    }

    if (req.method === 'GET' && p === '/api/repos') {
      const { file, repos, missing } = readRepos(url.searchParams.get('list'));
      return send(res, 200, { file, missing, repos: await Promise.all(repos.map(describeRepo)) });
    }

    if (req.method === 'GET' && p === '/api/log') {
      const name = url.searchParams.get('repo') || '';
      const job = jobs.get(name);
      if (job) return send(res, 200, { lines: job.log });
      // Sin trabajo en memoria (panel reabierto): último log guardado en disco
      try {
        const file = logFile(name);
        const stat = fs.statSync(file);
        const lines = fs.readFileSync(file, 'utf8').split(/\r?\n/).filter(Boolean);
        return send(res, 200, { lines, fromDisk: true, savedAt: stat.mtime.toISOString() });
      } catch { return send(res, 200, { lines: [] }); }
    }

    if (req.method === 'GET' && p === '/api/diffstat') {
      const name = url.searchParams.get('repo') || '';
      const { repos } = readRepos(url.searchParams.get('list'));
      if (!repos.some((r) => r.name === name)) return send(res, 400, { error: 'Repo no encontrado en la lista' });
      const dir = path.join(WORK_DIR, name);
      if (!fs.existsSync(dir)) return send(res, 400, { error: 'El repo no está clonado' });
      return send(res, 200, await gitDiffStat(dir));
    }

    if (req.method === 'GET' && p === '/api/stream') {
      res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-store', Connection: 'keep-alive' });
      res.write('retry: 2000\n\n');
      sseClients.add(res);
      const ping = setInterval(() => res.write(': ping\n\n'), 25000);
      req.on('close', () => { clearInterval(ping); sseClients.delete(res); });
      return;
    }

    if (req.method === 'GET' && p === '/api/list') {
      const file = resolveListPath(url.searchParams.get('list'));
      return send(res, 200, { file, content: fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : '' });
    }

    if (req.method === 'PUT' && p === '/api/list') {
      const body = await readBody(req);
      const file = resolveListPath(body.list);
      // Crear listas nuevas solo dentro del directorio de trabajo; fuera, solo editar las que ya existen.
      if (!fs.existsSync(file) && !isInside(WORK_DIR, file)) {
        return send(res, 400, { error: `Solo se pueden crear listas nuevas dentro de ${WORK_DIR}` });
      }
      let content = String(body.content || '');
      if (!content.endsWith('\n')) content += '\n'; // el bash necesita salto de línea final
      fs.writeFileSync(file, content, 'utf8');
      return send(res, 200, { ok: true, file });
    }

    if (req.method === 'POST' && p === '/api/action') {
      const body = await readBody(req);
      const action = String(body.action || '');
      const branch = String(body.branch || '').trim();
      const baseBranch = String(body.baseBranch || '').trim();
      const runCmd = String(body.runCmd || '').trim();
      if (!ACTIONS.has(action)) return send(res, 400, { error: 'Acción no válida' });
      if (branch && !BRANCH_RE.test(branch)) return send(res, 400, { error: 'Nombre de rama no válido' });
      if (action === 'checkout' && !branch) return send(res, 400, { error: 'Indica la rama en el campo "Rama (Pull/Checkout)"' });
      if (action === 'newbranch' && !branch) return send(res, 400, { error: 'Indica el nombre de la rama nueva' });
      if (action === 'newbranch' && baseBranch && !BRANCH_RE.test(baseBranch)) return send(res, 400, { error: 'Nombre de rama base no válido' });
      if (action === 'newbranch' && !(await isValidGitBranchName(branch))) return send(res, 400, { error: 'El nombre de la rama nueva no es válido para Git' });
      if (action === 'newbranch' && baseBranch && !(await isValidGitBranchName(baseBranch))) return send(res, 400, { error: 'El nombre de la rama base no es válido para Git' });
      if (action === 'run' && (runCmd.length > 500 || /[\r\n\0]/.test(runCmd))) {
        return send(res, 400, { error: 'El comando de Run no es válido (máx. 500 caracteres, sin saltos de línea ni NUL)' });
      }
      const commitMsg = String(body.commitMsg || '').trim();
      if (action === 'commit' && (!commitMsg || commitMsg.length > 2000)) {
        return send(res, 400, { error: 'El mensaje de commit es obligatorio (máx. 2000 caracteres)' });
      }
      const installCmd = String(body.installCmd || '').trim();
      if (installCmd && !INSTALL_CMD_RE.test(installCmd)) {
        return send(res, 400, { error: 'Comando de install no válido (máx. 200 caracteres, sin ; & | < > ` $ ni saltos de línea)' });
      }
      const { file, repos, missing } = readRepos(body.list);
      if (missing) return send(res, 400, { error: `No existe ${file}` });
      const wanted = new Set(Array.isArray(body.repos) ? body.repos.map(String) : []);
      const started = [];
      const busy = [];
      const targets = repos.filter((r) => wanted.has(r.name));
      const extra = { branch, baseBranch, installCmd, runCmd, commitMsg };
      // Resumen al terminar el lote (no en "run": sus procesos siguen vivos hasta que se detienen)
      const free = targets.filter((r) => { const j = jobs.get(r.name); return !j || (j.status !== 'running' && j.status !== 'stopping'); });
      const batchId = action !== 'run' && free.length > 1 ? createBatch(action, free.map((r) => r.name), extra) : null;
      for (const r of targets) {
        (startJob(r, action, file, extra, batchId) ? started : busy).push(r.name);
      }
      return send(res, 200, { started, busy });
    }

    if (req.method === 'POST' && p === '/api/unlock') {
      const body = await readBody(req);
      const name = String(body.repo || '');
      const { repos } = readRepos(body.list);
      if (!repos.some((r) => r.name === name)) return send(res, 400, { error: 'Repo no encontrado en la lista' });
      const dir = path.join(WORK_DIR, name);
      const age = lockAge(dir);
      if (age === null) return send(res, 200, { unlocked: false, message: 'No había bloqueo' });
      const job = jobs.get(name);
      if (job && (job.status === 'running' || job.status === 'stopping')) {
        return send(res, 409, { error: `Hay una acción en curso en ${name}; espera a que termine o deténla` });
      }
      // Regla conservadora: solo si no hay ningún git en ejecución, o si el bloqueo es viejo (> 2 min).
      if (age < 120 && (await gitRunning())) {
        return send(res, 409, { error: 'Hay un git en ejecución y el bloqueo es reciente; espera unos segundos y vuelve a intentarlo' });
      }
      fs.unlinkSync(path.join(dir, '.git', 'index.lock'));
      return send(res, 200, { unlocked: true });
    }

    if (req.method === 'POST' && p === '/api/stop') {
      const body = await readBody(req);
      if (body.all) return send(res, 200, { stopped: stopAll() });
      return send(res, 200, { stopped: stopJob(String(body.repo || '')) ? 1 : 0 });
    }

    if (req.method === 'POST' && p === '/api/open') {
      const body = await readBody(req);
      const target = body.target === 'folder' ? 'folder' : 'code';
      const { repos } = readRepos(body.list);
      const dir = resolveRepoDir(body.repo, repos, WORK_DIR);
      if (!dir) return send(res, 400, { error: 'Repo no válido para esta lista' });
      if (!fs.existsSync(dir)) return send(res, 400, { error: `${body.repo} no está clonado (haz Pull primero)` });
      try { await openRepoPath(target, dir); } catch (e) { return send(res, 400, { error: e.message }); }
      return send(res, 200, { opened: true, target, dir });
    }

    if (req.method === 'POST' && p === '/api/curl') {
      const body = await readBody(req);
      let parsed;
      try { parsed = parseCurl(body.command); } catch (e) { return send(res, 400, { error: e.message }); }
      return send(res, 200, await runCurl(parsed.args, parsed.timeoutMs));
    }

    return send(res, 404, { error: 'No encontrado' });
  } catch (err) {
    return send(res, 500, { error: err.message });
  }
});

// ── Abrir un repo en VS Code o en el explorador de archivos (botones de la tarjeta) ──
// Carpeta del repo si está en la lista y dentro del directorio de trabajo; si no, null. Pura, para los tests.
function resolveRepoDir(name, repos, workDir) {
  const n = String(name || '');
  if (!n || /[\\/]/.test(n) || n === '.' || n === '..') return null;
  if (!repos.some((r) => r.name === n)) return null;
  const dir = path.join(workDir, n);
  return isInside(workDir, dir) && dir !== path.resolve(workDir) ? dir : null;
}

function openRepoPath(target, dir) {
  return new Promise((resolve, reject) => {
    if (target === 'folder') {
      const cmd = IS_WIN ? ['explorer.exe', [dir]] : process.platform === 'darwin' ? ['open', [dir]] : ['xdg-open', [dir]];
      try {
        const child = spawn(cmd[0], cmd[1], { detached: true, stdio: 'ignore', windowsHide: true });
        child.on('error', (e) => reject(new Error(`No se pudo abrir el explorador: ${e.message}`)));
        child.unref();
        setTimeout(resolve, 300); // explorer.exe devuelve 1 aunque abra bien: no se mira el código
      } catch (e) { reject(e); }
      return;
    }
    // VS Code: en Windows "code" es un .cmd, así que se lanza a través de cmd /c
    const cmd = IS_WIN ? ['cmd', ['/c', 'code', dir]] : ['code', [dir]];
    const notFound = new Error('No se encuentra el comando "code". En VS Code: Ctrl+Shift+P → "Shell Command: Install \'code\' command in PATH" y reinicia el panel.');
    let child;
    try { child = spawn(cmd[0], cmd[1], { detached: !IS_WIN, stdio: 'ignore', windowsHide: true }); } catch { return reject(notFound); }
    const timer = setTimeout(() => { child.unref(); resolve(); }, 2500); // sigue vivo: VS Code se está abriendo
    child.on('error', () => { clearTimeout(timer); reject(notFound); });
    child.on('exit', (code) => { clearTimeout(timer); code === 0 ? resolve() : reject(notFound); });
  });
}

function openBrowser(url) {
  const cmd = IS_WIN ? ['cmd', ['/c', 'start', '', url]] : process.platform === 'darwin' ? ['open', [url]] : ['xdg-open', [url]];
  try { spawn(cmd[0], cmd[1], { detached: true, stdio: 'ignore', windowsHide: true }).unref(); } catch {}
}

function shutdown() {
  const n = stopAll();
  setTimeout(() => process.exit(0), n ? 3000 : 0); // dar tiempo a que taskkill termine
}

function main() {
  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE' && PORT < BASE_PORT + PORT_TRIES - 1) {
      PORT++; // sin --port: probar el siguiente puerto
      server.listen(PORT, HOST);
      return;
    }
    if (err.code === 'EADDRINUSE') {
      console.error(PORT_EXPLICIT
        ? `[ERROR] El puerto ${PORT} está en uso. Usa: mfs ui --port <otro>`
        : `[ERROR] No hay puertos libres entre ${BASE_PORT} y ${PORT}. Usa: mfs ui --port <otro>`);
    } else {
      console.error('[ERROR]', err.message);
    }
    process.exit(1);
  });

  server.on('listening', () => {
    registerPanel();
    const url = `http://${HOST}:${PORT}`;
    console.log(`\n  Panel mfs ${VERSION} en ${url}`);
    if (PORT !== BASE_PORT) console.log(`  (el puerto ${BASE_PORT} estaba ocupado, se usa el ${PORT})`);
    console.log(`  Directorio de trabajo: ${WORK_DIR}`);
    console.log('  Ctrl+C para cerrar (detiene los procesos lanzados desde el panel).\n');
    if (OPEN_BROWSER) openBrowser(url);
  });

  server.listen(PORT, HOST);
  process.on('exit', unregisterPanel);
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

// Solo arranca al ejecutarse directamente (mfs ui); al importarlo (tests) solo expone las funciones puras.
if (require.main === module) main();

module.exports = { parseList, healthUrl, resolveRepoDir, normalizePath, isInside, staticFile, readInstallDate, parseCurl, parseCurlOutput, stripCreds, PORT_RE, COMPILE_OK_RE, COMPILE_FAIL_RE, BUNDLER_RE };
