// Panel lateral: secciones plegables, toggle ☰, resúmenes y token git.
import { $, api, toast, state, runCmdKey, saveRunCmd } from './core.js';

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
