#!/usr/bin/env node
// Panel web local para mfs (Manager Repo).
// Sin dependencias externas: solo módulos nativos de Node.
// No reimplementa la lógica de git/npm: por cada repo lanza el mismo manager_repo.sh
// con MFS_ONLY=<repo>, de modo que el trabajo sigue en paralelo y con el mismo rendimiento.
//
// Uso:  mfs ui [--port 4777] [--no-open]
//       (se ejecuta en el directorio donde están los repos y el listRep.txt)

'use strict';

const http = require('http');
const fs = require('fs');
const path = require('path');
const { spawn, execFile } = require('child_process');

// ── Configuración ───────────────────────────────────────────────────────────
const args = process.argv.slice(2);
const argValue = (name, def) => {
  const i = args.indexOf(name);
  return i >= 0 && args[i + 1] ? args[i + 1] : def;
};
const PORT = parseInt(argValue('--port', process.env.MFS_UI_PORT || '4777'), 10);
const OPEN_BROWSER = !args.includes('--no-open');
// Primer argumento posicional = lista inicial (igual que "mfs run otra/lista.txt")
const DEFAULT_LIST = args.find((a, i) => !a.startsWith('--') && args[i - 1] !== '--port') || 'listRep.txt';
const HOST = '127.0.0.1';
const IS_WIN = process.platform === 'win32';
const WORK_DIR = process.cwd();
const BASH = process.env.MFS_BASH || 'bash';
const toPosix = (p) => p.replace(/\\/g, '/');
const SCRIPT = toPosix(path.join(__dirname, '..', 'manager_repo.sh'));
const ACTIONS = new Set(['pull', 'install', 'updeps', 'run']);
const BRANCH_RE = /^[\w./-]{1,200}$/;
const MAX_LOG_LINES = 2000;

// ── Estado ──────────────────────────────────────────────────────────────────
/** @type {Map<string, {child: any, action: string, status: string, log: string[], port: number|null, stopping: boolean}>} */
const jobs = new Map();
const sseClients = new Set();

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
  for (const raw of content.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.includes('#EXCLUDE') || line.startsWith('#')) continue;
    const tokens = line.split(/\s+/);
    const url = tokens[0];
    const last = tokens[tokens.length - 1];
    const isNew = tokens.length > 1 && last.includes('#NEW');
    const cmdTokens = isNew ? tokens.slice(1, -1) : tokens.slice(1);
    const command = cmdTokens.join(' ') || 'npm run start';
    // Igual que en bash: `basename "$repo_url" .git` (nombre de la carpeta que crea git clone)
    const name = url.replace(/\/+$/, '').split('/').pop().replace(/\.git$/, '');
    repos.push({ name, url: stripCreds(url), command, isNew });
  }
  return repos;
}

function readRepos(list) {
  const file = resolveListPath(list);
  if (!fs.existsSync(file)) return { file, repos: [], missing: true };
  return { file, repos: parseList(fs.readFileSync(file, 'utf8')), missing: false };
}

function gitBranch(dir) {
  return new Promise((resolve) => {
    execFile('git', ['-C', dir, 'rev-parse', '--abbrev-ref', 'HEAD'], { timeout: 5000 }, (err, out) =>
      resolve(err ? null : out.trim())
    );
  });
}

async function describeRepo(r) {
  const dir = fs.existsSync(path.join(WORK_DIR, r.name)) ? path.join(WORK_DIR, r.name) : null;
  const job = jobs.get(r.name);
  return {
    ...r,
    cloned: !!dir,
    hasDeps: !!dir && fs.existsSync(path.join(dir, 'node_modules')),
    branch: dir ? await gitBranch(dir) : null,
    status: job ? job.status : 'idle',
    action: job ? job.action : null,
    port: job ? job.port : null,
  };
}

function broadcast(event) {
  const data = `data: ${JSON.stringify(event)}\n\n`;
  for (const res of sseClients) res.write(data);
}

function pushLog(name, text) {
  const job = jobs.get(name);
  if (!job) return;
  for (const piece of stripAnsi(text).split(/\r?\n|\r/)) {
    if (!piece.trim()) continue;
    job.log.push(piece);
    if (job.log.length > MAX_LOG_LINES) job.log.shift();
    if (job.action === 'run' && !job.port) {
      const m = piece.match(/(?:localhost|127\.0\.0\.1|0\.0\.0\.0):(\d{2,5})/);
      if (m) {
        job.port = parseInt(m[1], 10);
        broadcast({ type: 'status', repo: name, status: job.status, action: job.action, port: job.port });
      }
    }
    broadcast({ type: 'log', repo: name, line: piece });
  }
}

function setStatus(name, status) {
  const job = jobs.get(name);
  job.status = status;
  broadcast({ type: 'status', repo: name, status, action: job.action, port: job.port });
}

function startJob(repo, action, branch, list) {
  const existing = jobs.get(repo.name);
  if (existing && existing.status === 'running') return false;

  const scriptArgs = [SCRIPT];
  if (action === 'pull' && branch) scriptArgs.push('-b', branch);
  scriptArgs.push(action, toPosix(list));

  const child = spawn(BASH, scriptArgs, {
    cwd: WORK_DIR,
    env: { ...process.env, MFS_ONLY: repo.name },
    detached: !IS_WIN, // en Unix: grupo de procesos propio para poder matar el árbol
    windowsHide: true,
  });
  jobs.set(repo.name, { child, action, status: 'running', log: [], port: null, stopping: false });
  setStatus(repo.name, 'running');
  pushLog(repo.name, `$ mfs ${action}${action === 'pull' && branch ? ' -b ' + branch : ''}  (${repo.name})`);
  if (action === 'run' && repo.isNew) pushLog(repo.name, 'Este repo usa #NEW: se abre en una ventana externa; su log no aparece aquí.');

  child.stdout.on('data', (d) => pushLog(repo.name, d.toString()));
  child.stderr.on('data', (d) => pushLog(repo.name, d.toString()));
  child.on('error', (err) => {
    pushLog(repo.name, `[ERROR] No se pudo ejecutar "${BASH}": ${err.message}. Define MFS_BASH con la ruta a bash.exe.`);
    setStatus(repo.name, 'error');
  });
  child.on('close', (code) => {
    const job = jobs.get(repo.name);
    if (!job || job.child !== child) return;
    pushLog(repo.name, `── proceso terminado (código ${code}) ──`);
    setStatus(repo.name, job.stopping ? 'stopped' : code === 0 ? 'ok' : 'error');
  });
  return true;
}

// En Git Bash (MSYS) los subshells "( ... ) &" se crean con fork y no conservan un padre
// Windows válido, así que "taskkill /T" desde el bash raíz no alcanza a npm/node.
// MSYS sí conserva el grupo de procesos: buscamos el PGID del bash lanzado (por su WINPID),
// recogemos los WINPID de todo ese grupo y matamos cada árbol nativo con taskkill /T.
function killWindowsTree(pid, done) {
  execFile(BASH, ['-c', 'ps'], { timeout: 10000, windowsHide: true }, (err, out) => {
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

function stopJob(name) {
  const job = jobs.get(name);
  if (!job || job.status !== 'running') return false;
  job.stopping = true;
  const pid = job.child.pid;
  if (IS_WIN) {
    killWindowsTree(pid);
  } else {
    try { process.kill(-pid, 'SIGTERM'); } catch { try { job.child.kill('SIGTERM'); } catch {} }
  }
  pushLog(name, '── deteniendo... ──');
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

async function killAllNode() {
  for (const job of jobs.values()) if (job.status === 'running') job.stopping = true;
  const procs = (await listNodeProcesses()).filter((p) => !p.self);
  if (IS_WIN) {
    await new Promise((r) => execFile('taskkill', ['/F', '/IM', 'node.exe', '/FI', `PID ne ${process.pid}`], { windowsHide: true }, () => r()));
  } else {
    for (const p of procs) { try { process.kill(p.pid, 'SIGTERM'); } catch {} }
  }
  stopAll(); // limpia también los bash de los trabajos del panel
  return procs.length;
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

    if (req.method === 'GET' && p === '/api/info') {
      return send(res, 200, { workDir: WORK_DIR, script: SCRIPT, bash: BASH, defaultList: DEFAULT_LIST });
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
      return send(res, 200, { processes: await listNodeProcesses() });
    }

    if (req.method === 'POST' && p === '/api/kill-node') {
      return send(res, 200, { killed: await killAllNode() });
    }

    if (req.method === 'POST' && p === '/api/github') {
      const body = await readBody(req);
      const urls = await fetchGithubRepos(String(body.org || '').trim(), String(body.token || '').trim());
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
      const job = jobs.get(url.searchParams.get('repo') || '');
      return send(res, 200, { lines: job ? job.log : [] });
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
      let content = String(body.content || '');
      if (!content.endsWith('\n')) content += '\n'; // el bash necesita salto de línea final
      fs.writeFileSync(file, content, 'utf8');
      return send(res, 200, { ok: true, file });
    }

    if (req.method === 'POST' && p === '/api/action') {
      const body = await readBody(req);
      const action = String(body.action || '');
      const branch = String(body.branch || '').trim();
      if (!ACTIONS.has(action)) return send(res, 400, { error: 'Acción no válida' });
      if (branch && !BRANCH_RE.test(branch)) return send(res, 400, { error: 'Nombre de rama no válido' });
      const { file, repos, missing } = readRepos(body.list);
      if (missing) return send(res, 400, { error: `No existe ${file}` });
      const wanted = new Set(Array.isArray(body.repos) ? body.repos.map(String) : []);
      const started = [];
      const busy = [];
      for (const r of repos) {
        if (!wanted.has(r.name)) continue;
        (startJob(r, action, branch, file) ? started : busy).push(r.name);
      }
      return send(res, 200, { started, busy });
    }

    if (req.method === 'POST' && p === '/api/stop') {
      const body = await readBody(req);
      if (body.all) return send(res, 200, { stopped: stopAll() });
      return send(res, 200, { stopped: stopJob(String(body.repo || '')) ? 1 : 0 });
    }

    return send(res, 404, { error: 'No encontrado' });
  } catch (err) {
    return send(res, 500, { error: err.message });
  }
});

function openBrowser(url) {
  const cmd = IS_WIN ? ['cmd', ['/c', 'start', '', url]] : process.platform === 'darwin' ? ['open', [url]] : ['xdg-open', [url]];
  try { spawn(cmd[0], cmd[1], { detached: true, stdio: 'ignore', windowsHide: true }).unref(); } catch {}
}

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`[ERROR] El puerto ${PORT} está en uso. Usa: mfs ui --port <otro>`);
  } else {
    console.error('[ERROR]', err.message);
  }
  process.exit(1);
});

server.listen(PORT, HOST, () => {
  const url = `http://${HOST}:${PORT}`;
  console.log(`\n  Panel mfs en ${url}`);
  console.log(`  Directorio de trabajo: ${WORK_DIR}`);
  console.log('  Ctrl+C para cerrar (detiene los procesos lanzados desde el panel).\n');
  if (OPEN_BROWSER) openBrowser(url);
});

function shutdown() {
  const n = stopAll();
  setTimeout(() => process.exit(0), n ? 3000 : 0); // dar tiempo a que taskkill termine
}
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
