// Panel lateral: secciones plegables, toggle ☰, resúmenes, token git y la franja LAUNCH PAD (información de mfs).
import { $, el, api, toast, state, runCmdKey, saveRunCmd, listName } from './core.js';

// ── Franja LAUNCH PAD: al pulsarla muestra información de mfs (solo lectura) ──
let mfsInfo = null;
let clockTimer = null;
const fmtDate = (d) => d.toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
const fmtDuration = (ms) => {
  const m = Math.floor(ms / 60000), h = Math.floor(m / 60), d = Math.floor(h / 24);
  return d ? `${d} d ${h % 24} h` : h ? `${h} h ${m % 60} min` : `${m} min`;
};
// Datos de solo lectura
const infoRow = (label, value) => (value ? [el('dt', {}, label), el('dd', { title: value }, value)] : []);

// Ruta de Windows → ruta de Git Bash (C:\a\b → /c/a/b), entrecomillada si hace falta
export function toShell(p) {
  let s = String(p || '');
  const m = /^([a-zA-Z]):[\\/](.*)$/.exec(s);
  if (m) s = `/${m[1].toLowerCase()}/${m[2]}`;
  s = s.replace(/\\/g, '/');
  return /^[\w@%+=:,./~-]+$/.test(s) ? s : `'${s.replace(/'/g, `'\\''`)}'`;
}
// Comandos listos para pegar en Git Bash, con la carpeta de trabajo, la lista activa y la rama del panel
function fillCommands() {
  const i = mfsInfo || {};
  const list = toShell(listName());
  const branch = toShell($('#branch').value.trim() || 'main');
  const cmds = [
    i.workDir && [`cd ${toShell(i.workDir)}`, 'Ir a la carpeta de trabajo del panel'],
    [`mfs ui ${list}`, 'Abrir el panel con la lista activa'],
    [`mfs -b ${branch} pull ${list}`, 'Clonar o actualizar los repos de la lista'],
    [`mfs status ${list}`, 'Ver los cambios de todos los repos'],
    i.sourceDir && ['mfs update', 'Actualizar mfs desde su repo de origen'],
    ['mfs version', 'Ver la versión instalada'],
  ].filter(Boolean);
  $('#infoCmds').replaceChildren(...cmds.map(([cmd, desc]) => el('li', {},
    el('code', {}, cmd),
    el('button', { class: 'sm', title: 'Copiar el comando', onclick: async () => {
      try { await navigator.clipboard.writeText(cmd); toast('Comando copiado'); } catch { toast('No se pudo copiar'); }
    } }, 'Copiar'),
    el('span', { class: 'muted' }, desc),
  )));
}
function tickClock() {
  const now = new Date();
  $('#infoTime').textContent = now.toLocaleTimeString();
  $('#infoDate').textContent = fmtDate(now);
  const up = $('#infoUptime');
  if (up && mfsInfo?.startedAt) up.textContent = `${new Date(mfsInfo.startedAt).toLocaleString()} · hace ${fmtDuration(now - new Date(mfsInfo.startedAt))}`;
}
function fillInfoList() {
  const i = mfsInfo || {};
  const list = $('#infoList');
  list.replaceChildren(
    ...infoRow('Instalado', i.installDate || 'sin instalar (panel lanzado desde el repo)'),
    ...infoRow('Instalación', i.installDir),
    ...infoRow('Repo origen', i.sourceDir),
    ...infoRow('Trabajo', i.workDir),
    ...infoRow('Lista', listName()),
    ...infoRow('Panel', i.port ? `http://127.0.0.1:${i.port}` : ''),
    el('dt', {}, 'Abierto'), el('dd', { id: 'infoUptime' }, ''),
    ...infoRow('Node', i.node ? `${i.node} · ${i.platform}` : ''),
    ...infoRow('Bash', i.bash),
  );
  fillCommands();
}
export function renderMfsInfo(info) {
  mfsInfo = info;
  $('#infoVersion').textContent = info.version ? 'v' + info.version : '';
  $('#railDigits').textContent = String(info.version || '').replace(/\D/g, '');
}
$('#mfsInfo').addEventListener('toggle', (ev) => {
  clearInterval(clockTimer);
  if (ev.newState !== 'open') return;
  fillInfoList(); // la lista activa puede haber cambiado
  tickClock();
  clockTimer = setInterval(tickClock, 1000);
});

// ── Color de acento (violeta, verde neón, cian, rosa, rojo); el selector está en la tarjeta de LAUNCH PAD
//    y la elección se guarda en este navegador ──
const ACCENTS = ['violeta', 'verde', 'cian', 'rosa', 'rojo'];
function applyAccent(name) {
  const accent = ACCENTS.includes(name) ? name : 'violeta';
  if (accent === 'violeta') document.documentElement.removeAttribute('data-accent');
  else document.documentElement.setAttribute('data-accent', accent);
  document.querySelectorAll('#accentPicker .accent-swatch').forEach((b) => b.setAttribute('aria-checked', String(b.dataset.accent === accent)));
}
document.querySelectorAll('#accentPicker .accent-swatch').forEach((b) => b.addEventListener('click', () => {
  localStorage.setItem('mfs.accent', b.dataset.accent);
  applyAccent(b.dataset.accent);
}));
applyAccent(localStorage.getItem('mfs.accent'));

export function loadRunCmd() { $('#runCmd').value = localStorage.getItem(runCmdKey()) || ''; updateSummaries(); }

// ── Token git (solo en memoria del servidor) ──
export function showTokenState(has) {
  $('#tokenState').textContent = has ? 'token cargado ✓' : 'sin token';
  $('#tokenState').classList.toggle('warn', !has);
  state.hasToken = has;
  updateSummaries();
}

// ── Secciones plegables de la cabecera ──
// Todas abiertas por defecto; las que el usuario pliega se recuerdan en este navegador.
// Plegada, cada sección muestra un resumen de su estado para no perder de vista rama, lista, etc.
const sections = [...document.querySelectorAll('.hsec')];
// Se filtran nombres de secciones que ya no existen (p. ej. la antigua "config")
state.sectionsClosed = new Set(JSON.parse(localStorage.getItem('mfs.sectionsClosed') || '[]').filter((s) => sections.some((x) => x.dataset.sec === s)));
function applySections() {
  for (const s of sections) {
    const open = !state.sectionsClosed.has(s.dataset.sec);
    s.dataset.open = open;
    s.querySelector('.hsec-head').setAttribute('aria-expanded', open);
  }
}
function setSection(sec, open) {
  open ? state.sectionsClosed.delete(sec) : state.sectionsClosed.add(sec);
  localStorage.setItem('mfs.sectionsClosed', JSON.stringify([...state.sectionsClosed]));
  applySections();
}
for (const s of sections) {
  s.querySelector('.hsec-head').onclick = () => setSection(s.dataset.sec, state.sectionsClosed.has(s.dataset.sec));
  s.querySelector('.hsec-summary').onclick = () => setSection(s.dataset.sec, true); // pulsar el resumen también despliega
}
// ☰ muestra u oculta el panel de control lateral; se recuerda en este navegador
export function applySidebar(open) {
  document.body.classList.toggle('sidebar-closed', !open);
  $('#sidebarToggle').setAttribute('aria-expanded', open);
}
$('#sidebarToggle').onclick = () => {
  const open = document.body.classList.contains('sidebar-closed');
  localStorage.setItem('mfs.sidebarOpen', open ? '1' : '0');
  applySidebar(open);
};
applySidebar(localStorage.getItem('mfs.sidebarOpen') !== '0');
export function updateSummaries() {
  const v = (id) => $(id).value.trim();
  const sum = (sec, text, title = text) => { const n = document.querySelector(`.hsec[data-sec="${sec}"] .hsec-summary`); n.textContent = text; n.title = title; };
  const branch = 'rama: ' + (v('#branch') || 'main');
  const token = 'token: ' + (state.hasToken ? 'cargado' : 'no');
  const running = state.repos.filter((r) => r.status === 'running' || r.status === 'stopping').length;
  const changes = state.repos.filter((r) => r.cloned && r.changes).length;
  const checked = state.repos.filter((r) => state.checked.has(r.name)).length;
  sum('repos', [`${checked} seleccionados de ${state.repos.length}`, running ? `${running} en ejecución` : null, branch,
    'install: ' + (v('#installCmd') || 'npm install'), 'run: ' + (v('#runCmd') || 'del .txt')].filter(Boolean).join(' · '));
  sum('git', changes ? `${changes} con cambios` : 'sin cambios');
  sum('token', token);
}
['#branch', '#installCmd', '#runCmd', '#list'].forEach((id) => $(id).addEventListener('input', updateSummaries));
// Rama, Install con y Run con se guardan al escribir (antes solo al lanzar una acción)
$('#branch').addEventListener('input', () => localStorage.setItem('mfs.branch', $('#branch').value.trim()));
$('#installCmd').addEventListener('input', () => localStorage.setItem('mfs.installCmd', $('#installCmd').value.trim()));
$('#runCmd').addEventListener('input', saveRunCmd);
applySections();

$('#tokenApply').onclick = async () => {
  const token = $('#gitToken').value.trim();
  if (!token) return toast('Escribe el token');
  try { const r = await api('/api/token', { method: 'POST', body: JSON.stringify({ token }) }); $('#gitToken').value = ''; showTokenState(r.hasToken); toast('Token cargado en memoria del panel'); }
  catch (e) { toast(e.message); }
};
$('#gitToken').onkeydown = (ev) => { if (ev.key === 'Enter') $('#tokenApply').onclick(); };
$('#tokenClear').onclick = async () => {
  try { const r = await api('/api/token', { method: 'POST', body: JSON.stringify({ token: '' }) }); showTokenState(r.hasToken); toast('Token eliminado'); }
  catch (e) { toast(e.message); }
};
