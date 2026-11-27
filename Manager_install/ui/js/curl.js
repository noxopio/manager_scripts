// Herramientas → cURL: ejecuta un comando curl en el servidor del panel y muestra la respuesta
// (JSON como árbol plegable o texto formateado, cabeceras y salida cruda).
import { $, el, api, toast } from './core.js';

const HISTORY_KEY = 'mfs.curlHistory';
const HISTORY_MAX = 10;
const OPEN_DEPTH = 2; // niveles del árbol abiertos al pintar

const cur = { res: null, json: undefined, tab: 'body', tree: true };

// ── Historial (últimos 10, en este navegador) ──
const readHistory = () => { try { return JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]'); } catch { return []; } };
function renderHistory() {
  const sel = $('#curlHistory');
  const items = readHistory();
  sel.replaceChildren(el('option', { value: '' }, items.length ? `Historial (${items.length})…` : 'Historial vacío'));
  items.forEach((cmd, i) => {
    const line = cmd.replace(/\s+/g, ' ').trim();
    sel.append(el('option', { value: String(i), title: line }, line.length > 90 ? line.slice(0, 90) + '…' : line));
  });
  $('#curlHistoryClear').disabled = !items.length;
}
function remember(cmd) {
  const items = [cmd, ...readHistory().filter((x) => x !== cmd)].slice(0, HISTORY_MAX);
  localStorage.setItem(HISTORY_KEY, JSON.stringify(items));
  renderHistory();
}

// ── Árbol JSON ──
// Los hijos de cada nodo se crean al abrirlo por primera vez (JSON grandes no bloquean la página).
function keyNode(key) {
  if (key === undefined) return null;
  return typeof key === 'number'
    ? el('span', { class: 'jt-idx' }, key + ': ')
    : el('span', { class: 'jt-key' }, JSON.stringify(key), el('span', { class: 'jt-punct' }, ': '));
}
function valueNode(v) {
  if (v === null) return el('span', { class: 'jt-null' }, 'null');
  if (typeof v === 'string') return el('span', { class: 'jt-str' }, JSON.stringify(v));
  if (typeof v === 'number') return el('span', { class: 'jt-num' }, String(v));
  return el('span', { class: 'jt-bool' }, String(v));
}
function jsonNode(value, key, depth) {
  if (value === null || typeof value !== 'object') return el('div', { class: 'jt-row' }, keyNode(key), valueNode(value));
  const isArr = Array.isArray(value);
  const entries = isArr ? value.map((v, i) => [i, v]) : Object.entries(value);
  const [open, close] = isArr ? ['[', ']'] : ['{', '}'];
  if (!entries.length) return el('div', { class: 'jt-row' }, keyNode(key), el('span', { class: 'jt-punct' }, open + close));
  const d = el('details', { class: 'jt' },
    el('summary', {}, keyNode(key), el('span', { class: 'jt-punct' }, open),
      el('span', { class: 'jt-count' }, `${entries.length} ${isArr ? (entries.length === 1 ? 'elemento' : 'elementos') : (entries.length === 1 ? 'clave' : 'claves')}`),
      el('span', { class: 'jt-punct jt-close-inline' }, close)));
  d.build = () => {
    if (d.built) return;
    d.built = true;
    const box = el('div', { class: 'jt-children' });
    for (const [k, v] of entries) box.append(jsonNode(v, k, depth + 1));
    d.append(box, el('div', { class: 'jt-punct jt-close' }, close));
  };
  d.addEventListener('toggle', () => { if (d.open) d.build(); });
  if (depth < OPEN_DEPTH) { d.build(); d.open = true; }
  return d;
}
function expandAll() {
  const out = $('#curlOut');
  let guard = 0, pending;
  // Cada pasada abre los nodos visibles; los que se crean al abrir se abren en la siguiente
  while ((pending = [...out.querySelectorAll('details.jt:not([open])')]).length && guard++ < 200) {
    for (const d of pending) { d.build(); d.open = true; }
  }
}

// ── Pintado de la respuesta ──
const fmtSize = (n) => (n == null ? '' : n < 1024 ? `${n} B` : n < 1048576 ? `${(n / 1024).toFixed(1)} KB` : `${(n / 1048576).toFixed(1)} MB`);
const headersText = (r) => r.headers.map(([k, v]) => `${k}: ${v}`).join('\n');
const rawText = (r) => [r.statusLine, headersText(r)].filter(Boolean).join('\n') + (r.statusLine ? '\n\n' : '') + r.body;
function parseJson(r) {
  const t = r.body.trim();
  if (!t || !(/json/i.test(r.contentType) || /^[[{]/.test(t))) return undefined;
  try { return JSON.parse(t); } catch { return undefined; }
}
function copyText() {
  const r = cur.res;
  if (!r) return '';
  if (cur.tab === 'headers') return headersText(r);
  if (cur.tab === 'raw') return rawText(r);
  return cur.json !== undefined ? JSON.stringify(cur.json, null, 2) : r.body;
}

function renderMeta(r) {
  const meta = $('#curlMeta'); meta.replaceChildren();
  if (r.status) {
    const reason = (r.statusLine.match(/^HTTP\/\S+ \d{3} ?(.*)$/) || [])[1] || '';
    meta.append(el('span', { class: `curl-code c${String(r.status)[0]}xx` }, `${r.status}${reason ? ' ' + reason : ''}`));
  }
  const bits = r.status ? [r.timeMs != null ? `${r.timeMs} ms` : null, fmtSize(r.size), r.contentType || null].filter(Boolean) : [];
  if (bits.length) meta.append(el('span', { class: 'muted' }, bits.join(' · ')));
  if (r.truncated) meta.append(el('span', { class: 'badge warn' }, 'respuesta recortada a 10 MB'));
  if (r.timedOut) meta.append(el('span', { class: 'badge warn' }, 'tiempo agotado'));
  if (r.stderr && (r.exitCode || !r.status)) meta.append(el('span', { class: 'curl-err' }, r.stderr));
}

function renderOut() {
  const r = cur.res, out = $('#curlOut');
  out.replaceChildren();
  document.querySelectorAll('.curl-tab').forEach((b) => b.setAttribute('aria-selected', String(b.dataset.tab === cur.tab)));
  const isTree = cur.tab === 'body' && cur.json !== undefined && cur.tree;
  $('#curlView').hidden = !(cur.tab === 'body' && cur.json !== undefined);
  $('#curlView').textContent = cur.tree ? 'Ver texto' : 'Ver árbol';
  $('#curlExpand').hidden = !isTree;
  if (isTree) { out.append(el('div', { class: 'jt-root' }, jsonNode(cur.json, undefined, 0))); return; }
  if (cur.tab === 'headers') {
    if (!r.headers.length) { out.append(el('div', { class: 'empty' }, 'Sin cabeceras')); return; }
    const pre = el('pre', { class: 'curl-pre' });
    if (r.statusLine) pre.append(el('span', { class: 'jt-punct' }, r.statusLine + '\n'));
    for (const [k, v] of r.headers) pre.append(el('span', { class: 'jt-key' }, k), el('span', { class: 'jt-punct' }, ': '), v + '\n');
    out.append(pre); return;
  }
  const text = cur.tab === 'raw' ? rawText(r) : (cur.json !== undefined ? JSON.stringify(cur.json, null, 2) : r.body);
  out.append(text ? el('pre', { class: 'curl-pre' }, text) : el('div', { class: 'empty' }, 'Respuesta sin cuerpo'));
}

// ── Ejecución ──
async function runCurl() {
  const command = $('#curlInput').value.trim();
  if (!command) return toast('Pega un comando curl');
  const btn = $('#curlRun');
  btn.disabled = true; btn.textContent = 'Ejecutando…';
  $('#curlMeta').replaceChildren(el('span', { class: 'muted' }, 'Ejecutando…'));
  try {
    const r = await api('/api/curl', { method: 'POST', body: JSON.stringify({ command }) });
    remember(command);
    cur.res = r; cur.json = parseJson(r); cur.tab = 'body';
    renderMeta(r);
    $('#curlResult').hidden = false;
    renderOut();
  } catch (e) {
    $('#curlMeta').replaceChildren(el('span', { class: 'curl-err' }, e.message));
  } finally {
    btn.disabled = false; btn.textContent = 'Ejecutar';
  }
}

// ── Eventos ──
$('#curlBtn').onclick = () => { renderHistory(); $('#curlDialog').showModal(); $('#curlInput').focus(); };
$('#curlClose').onclick = () => $('#curlDialog').close();
$('#curlRun').onclick = runCurl;
$('#curlInput').onkeydown = (ev) => { if (ev.key === 'Enter' && (ev.ctrlKey || ev.metaKey)) { ev.preventDefault(); runCurl(); } };
$('#curlClear').onclick = () => {
  $('#curlInput').value = '';
  cur.res = null; cur.json = undefined;
  $('#curlResult').hidden = true; $('#curlMeta').replaceChildren();
  $('#curlInput').focus();
};
$('#curlHistory').onchange = (ev) => {
  const cmd = readHistory()[Number(ev.target.value)];
  if (ev.target.value !== '' && cmd) $('#curlInput').value = cmd;
  ev.target.value = '';
  $('#curlInput').focus();
};
$('#curlHistoryClear').onclick = () => { localStorage.removeItem(HISTORY_KEY); renderHistory(); toast('Historial de cURL borrado'); };
document.querySelectorAll('.curl-tab').forEach((b) => { b.onclick = () => { cur.tab = b.dataset.tab; renderOut(); }; });
$('#curlView').onclick = () => { cur.tree = !cur.tree; renderOut(); };
$('#curlExpand').onclick = expandAll;
$('#curlCopy').onclick = async () => {
  const text = copyText();
  try { await navigator.clipboard.writeText(text); toast('Copiado'); }
  catch { toast('No se pudo copiar'); }
};
