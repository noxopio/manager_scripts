// Lista de repos: carga, pintado (cards y grupos), selección, log y acciones.
import { $, el, api, toast, state, STATUS_LABEL, COMPILE_LABEL, ACTION_LABEL, listName, saveCollapsed, saveRunCmd, isBusy } from './core.js';
import { icon, cupSvg } from './icons.js';
import { emptyArtState, resetEmptyArt } from './empty-art.js';
import { listArtNode } from './list-art.js';
import { updateSummaries } from './sidebar.js';
import { openCommit, gitPush, unlockRepo } from './git.js';
import { setLog } from './logview.js';
import { elapsedText } from './time.js';
import { ask } from './dialogs.js';
import { isDangerousCmd } from './danger.js';

// Loader del panel de repos (primera carga o cambio de lista): la taza de café humeante.
// Solo aparece si la carga tarda más de 150 ms, para no parpadear en cargas rápidas.
const LOADER_DELAY_MS = 150;
export function showLoader() {
  $('#repos').replaceChildren(el('div', { class: 'repos-loading', role: 'status' },
    cupSvg('loader-cup'), el('span', { class: 'loader-text engraved' }, 'Cargando repos…')));
}

export async function loadRepos() {
  const loaderTimer = state.first ? setTimeout(showLoader, LOADER_DELAY_MS) : null;
  if (state.first) loadFilter(); // primera carga o cambio de lista: el filtro guardado de esa lista
  try {
    const data = await api('/api/repos?list=' + encodeURIComponent(listName()));
    state.repos = data.repos;
    if (state.first || $('#selectAll').checked) state.checked = new Set(data.repos.map((r) => r.name));
    state.first = false;
    clearTimeout(loaderTimer);
    render(data.missing ? `No existe ${data.file}. Usa "Editar lista" para crearlo.` : null);
  } catch (e) {
    clearTimeout(loaderTimer);
    if ($('#repos .repos-loading')) $('#repos').replaceChildren(emptyArtState('error', 'No se pudo cargar la lista', e.message));
    toast(e.message);
  }
}

let refreshTimer;
export const scheduleRefresh = () => { clearTimeout(refreshTimer); refreshTimer = setTimeout(loadRepos, 600); };

export function statusNode(r) {
  // El texto va en .st-text para que la vista compacta pueda dejar solo el punto (con el texto en el tooltip)
  if (r.status === 'running' && r.action === 'run' && r.compile) {
    const label = `${COMPILE_LABEL[r.compile]} · run`;
    return el('span', { class: 'status ' + r.compile, title: label }, el('span', { class: 'dot' }), el('span', { class: 'st-text' }, label));
  }
  const label = STATUS_LABEL[r.status] + (r.action && r.status !== 'idle' ? ` · ${ACTION_LABEL[r.action]}` : '');
  return el('span', { class: 'status ' + r.status, title: label }, el('span', { class: 'dot' }), el('span', { class: 'st-text' }, label));
}

// Eventos del filtro (solo en el navegador)
if (typeof document !== 'undefined') {
  $('#repoFilter').addEventListener('input', () => {
    const q = filterQuery();
    if (q) localStorage.setItem(filterKey(), q); else localStorage.removeItem(filterKey());
    render();
  });
  $('#repoFilter').addEventListener('keydown', (ev) => {
    if (ev.key === 'Escape' && $('#repoFilter').value) { ev.stopPropagation(); $('#repoFilter').value = ''; $('#repoFilter').dispatchEvent(new Event('input')); }
  });
}

// Health check ("#> health:" en el .txt): punto verde/rojo mientras el repo corre; gris hasta la primera respuesta.
export function healthNode(r) {
  if (!r.health || r.status !== 'running' || r.action !== 'run') return null;
  const h = r.healthState;
  const cls = !h ? 'pending' : h.ok ? 'up' : 'down';
  const when = h ? new Date(h.at).toLocaleTimeString() : '';
  const title = !h ? `Health: comprobando ${r.health}…`
    : h.ok ? `Health OK (${h.code}) · ${h.url} · ${when}`
    : `Health caído (${h.code || h.error}) · ${h.url} · ${when}`;
  return el('span', { class: `health ${cls}`, title, 'aria-label': title }, el('span', { class: 'health-dot' }), 'health');
}

// Enlace al puerto solo cuando ya compiló; mientras tanto, un aviso sin enlace.
export function portNode(r) {
  if (!r.port || r.status !== 'running') return null;
  if (r.compile === 'compiling') {
    return el('span', { class: 'badge warn', title: 'webpack anunció el puerto pero aún está compilando; espera a que diga "listo"' }, `compilando… :${r.port}`);
  }
  return el('a', { href: 'http://localhost:' + r.port, target: '_blank', onclick: (ev) => ev.stopPropagation() }, 'localhost:' + r.port);
}

// ── Filtro de repos (por lista, en este navegador) ──
const norm = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
// ¿El repo encaja con el filtro? Todas las palabras deben aparecer en nombre, rama, grupo, estado o comando. Pura, para los tests.
export function repoMatches(r, query) {
  const terms = norm(query).split(/\s+/).filter(Boolean);
  if (!terms.length) return true;
  const hay = norm([r.name, r.branch, r.group, r.status, STATUS_LABEL[r.status], r.compile, COMPILE_LABEL[r.compile],
    r.command, r.changes ? 'cambios' : '', r.cloned ? '' : 'sin clonar', r.locked ? 'bloqueado' : ''].join(' '));
  return terms.every((t) => hay.includes(t));
}
const filterKey = () => 'mfs.filter.' + listName();
export function loadFilter() { $('#repoFilter').value = localStorage.getItem(filterKey()) || ''; }
const filterQuery = () => $('#repoFilter').value.trim();

// ── Tiempo en la tarjeta ("⏱ arriba 1 h 12 min", "pull ok en 8 s · hace 3 min") ──
function elapsedNode(r) {
  const text = elapsedText(r);
  return text ? el('span', { class: 'elapsed', 'data-repo': r.name, title: r.startedAt ? `Inicio: ${new Date(r.startedAt).toLocaleString()}` : '' }, text) : null;
}
// Avanza sin repintar todo
if (typeof document !== 'undefined') {
  setInterval(() => {
    for (const span of document.querySelectorAll('#repos .elapsed')) {
      const r = state.repos.find((x) => x.name === span.dataset.repo);
      if (r) span.textContent = elapsedText(r);
    }
  }, 15000);
}

// ── Abrir en VS Code / carpeta ──
export async function openRepo(name, target = 'code') {
  try {
    toast(target === 'code' ? `Abriendo ${name} en VS Code…` : `Abriendo la carpeta de ${name}…`);
    await api('/api/open', { method: 'POST', body: JSON.stringify({ repo: name, list: listName(), target }) });
  } catch (e) { toast(e.message); }
}

// ── Barra de resumen clicable: filtra la lista por estado ──
const SUMMARY = [
  { key: 'running', label: (n) => `${n} en ejecución`, cls: 'run', count: (rs) => rs.filter(isBusy).length },
  { key: 'cambios', label: (n) => `${n} con cambios`, cls: 'warn', count: (rs) => rs.filter((r) => r.cloned && r.changes).length },
  { key: 'error', label: (n) => `${n} con error`, cls: 'err', count: (rs) => rs.filter((r) => r.status === 'error' || r.compile === 'failed').length },
  { key: 'sin clonar', label: (n) => `${n} sin clonar`, cls: 'muted', count: (rs) => rs.filter((r) => !r.cloned).length },
  { key: 'bloqueado', label: (n) => `${n} bloqueado${n > 1 ? 's' : ''}`, cls: 'warn', count: (rs) => rs.filter((r) => r.locked).length },
];
function renderSummary() {
  const box = $('#repoSummary');
  const q = filterQuery().toLowerCase();
  const chips = SUMMARY.map((s) => ({ ...s, n: s.count(state.repos) })).filter((s) => s.n > 0);
  box.hidden = !chips.length;
  box.replaceChildren(...chips.map((s) => el('button', {
    class: `sum-chip ${s.cls}` + (q === s.key ? ' active' : ''), 'aria-pressed': String(q === s.key),
    title: q === s.key ? 'Quitar el filtro' : `Filtrar: ${s.key}`,
    onclick: () => {
      const f = $('#repoFilter');
      f.value = q === s.key ? '' : s.key;
      f.dispatchEvent(new Event('input'));
    },
  }, s.label(s.n))));
}

// ── Vista compacta ──
const COMPACT_KEY = 'mfs.compact';
export function setCompact(on) {
  document.querySelector('.list-panel').classList.toggle('compact-list', on);
  const btn = $('#compactToggle');
  btn.setAttribute('aria-pressed', String(on));
  // El icono muestra lo que hará al pulsarlo: >< compactar, <> volver a la vista normal
  btn.replaceChildren(icon(on ? 'expand-h' : 'compress'));
  const label = on ? 'Vista normal: tarjetas completas' : 'Vista compacta: una fila por repo';
  btn.title = label; btn.setAttribute('aria-label', label);
  localStorage.setItem(COMPACT_KEY, on ? '1' : '0');
}
if (typeof document !== 'undefined') {
  setCompact(localStorage.getItem(COMPACT_KEY) === '1');
  $('#compactToggle').onclick = () => setCompact(!document.querySelector('.list-panel').classList.contains('compact-list'));
}

// ── Atajos de teclado en la lista ──
const visibleCards = () => [...document.querySelectorAll('#repos .card')].filter((c) => c.offsetParent !== null);
function focusCard(card) { if (card) { card.focus(); card.scrollIntoView({ block: 'nearest' }); } }
if (typeof document !== 'undefined') {
  $('#repos').addEventListener('keydown', (ev) => {
    const card = ev.target.closest && ev.target.closest('.card');
    if (!card || ev.target !== card || ev.ctrlKey || ev.metaKey || ev.altKey) return; // no interferir con botones/casillas
    const name = card.dataset.repo;
    const cards = visibleCards();
    const i = cards.indexOf(card);
    const key = ev.key.length === 1 ? ev.key.toLowerCase() : ev.key;
    const r = state.repos.find((x) => x.name === name);
    const busy = r && isBusy(r);
    const actions = {
      ArrowDown: () => focusCard(cards[Math.min(cards.length - 1, i + 1)]), j: () => focusCard(cards[Math.min(cards.length - 1, i + 1)]),
      ArrowUp: () => focusCard(cards[Math.max(0, i - 1)]), k: () => focusCard(cards[Math.max(0, i - 1)]),
      Home: () => focusCard(cards[0]), End: () => focusCard(cards[cards.length - 1]),
      Enter: () => selectRepo(name),
      ' ': () => { const cb = card.querySelector('input[type=checkbox]'); cb.checked = !cb.checked; cb.dispatchEvent(new Event('change')); },
      r: () => !busy && r?.cloned && runAction('run', [name]),
      p: () => !busy && runAction('pull', [name]),
      i: () => !busy && r?.cloned && runAction('install', [name]),
      d: () => r?.status === 'running' && stop(name),
      o: () => r?.cloned && openRepo(name, 'code'),
    };
    if (actions[key]) { ev.preventDefault(); actions[key](); }
  });
}

export function render(emptyMsg) {
  // Las tarjetas se rehacen en cada render: se recupera el foco del teclado en la misma tarjeta
  const focused = document.activeElement && document.activeElement.closest && document.activeElement.closest('#repos .card');
  const focusName = focused && document.activeElement === focused ? focused.dataset.repo : null;
  renderList(emptyMsg);
  renderSummary();
  if (focusName) focusCard([...document.querySelectorAll('#repos .card')].find((c) => c.dataset.repo === focusName));
}

function renderList(emptyMsg) {
  const box = $('#repos'); box.innerHTML = '';
  updateActivityIndicator();
  if (!state.repos.length) {
    box.append(emptyArtState(emptyMsg ? 'missing' : 'empty', emptyMsg ? 'No se pudo cargar la lista' : 'No hay repos activos', emptyMsg || 'Agrega repositorios a la lista para verlos aquí.'), listArtNode());
    $('#toggleGroups').hidden = true;
    $('#repoFilterCount').textContent = '';
    return;
  }
  const query = filterQuery();
  const visible = state.repos.filter((r) => repoMatches(r, query));
  $('#repoFilterCount').textContent = query ? `${visible.length}/${state.repos.length}` : '';
  if (!visible.length) {
    box.append(emptyArtState('filter', 'Ningún repo coincide con el filtro', `"${query}" · Esc en el filtro para limpiarlo`), listArtNode());
    return;
  }
  resetEmptyArt(); // hay repos visibles: el próximo vacío elegirá otro personaje
  const hasGroups = visible.some((r) => r.group);
  $('#toggleGroups').hidden = !hasGroups;
  if (!hasGroups) { for (const r of visible) box.append(repoCard(r)); box.append(listArtNode()); return; }
  // Agrupa respetando el orden del .txt; los repos antes de la primera cabecera van a "Sin grupo"
  const groups = new Map();
  for (const r of visible) {
    const g = r.group || 'Sin grupo';
    if (!groups.has(g)) groups.set(g, []);
    groups.get(g).push(r);
  }
  for (const [g, repos] of groups) box.append(groupNode(g, repos));
  box.append(listArtNode());
  const allCollapsed = [...groups.keys()].every((g) => state.collapsed.has(g));
  setGroupsBtn(allCollapsed);
}

// Icono de expandir/contraer grupos (con tooltip), junto a Recargar estado
export function setGroupsBtn(allCollapsed) {
  const b = $('#toggleGroups');
  const label = allCollapsed ? 'Expandir todos los grupos' : 'Contraer todos los grupos';
  b.replaceChildren(icon(allCollapsed ? 'expand' : 'collapse'));
  b.title = label + ' (## Nombre en el .txt)';
  b.setAttribute('aria-label', label);
}

export function groupNode(g, repos) {
  const names = repos.map((r) => r.name);
  const nChecked = names.filter((n) => state.checked.has(n)).length;
  const cb = el('input', { type: 'checkbox', title: 'Seleccionar los repos de este grupo', onclick: (ev) => ev.stopPropagation(), onchange: (ev) => {
    for (const n of names) ev.target.checked ? state.checked.add(n) : state.checked.delete(n);
    $('#selectAll').checked = state.checked.size === state.repos.length;
    render();
  } });
  cb.checked = nChecked === names.length;
  cb.indeterminate = nChecked > 0 && nChecked < names.length;
  const busy = repos.filter(isBusy).length;
  const changes = repos.filter((r) => r.cloned && r.changes).length;
  const locked = repos.filter((r) => r.locked).length;
  // Las acciones del grupo solo actúan sobre los repos marcados de ese grupo
  const checkedNames = names.filter((n) => state.checked.has(n));
  const checkedRunning = repos.filter((r) => state.checked.has(r.name) && r.status === 'running');
  const act = (a) => (ev) => {
    ev.preventDefault(); ev.stopPropagation();
    if (!checkedNames.length) return toast('Marca al menos un repo del grupo');
    runAction(a, checkedNames);
  };
  const selInfo = nChecked === names.length ? 'todos los repos del grupo' : `los ${nChecked} repos marcados del grupo`;
  const summary = el('summary', {},
    cb,
    el('span', { class: 'group-name' }, g),
    el('span', { class: 'muted' }, `${repos.length} repo${repos.length > 1 ? 's' : ''}`),
    busy ? el('span', { class: 'badge', title: 'Acciones en curso en este grupo' }, `${busy} en ejecución`) : null,
    changes ? el('span', { class: 'badge warn', title: 'Repos con cambios sin commit' }, `● ${changes} con cambios`) : null,
    locked ? el('span', { class: 'badge warn lock-badge', title: 'Repos con .git/index.lock' }, icon('lock'), `${locked} bloqueado${locked > 1 ? 's' : ''}`) : null,
    el('span', { class: 'group-actions' },
      el('button', { class: 'sm', title: `Pull de ${selInfo}`, onclick: act('pull'), ...(nChecked ? {} : { disabled: '' }) }, 'Pull'),
      el('button', { class: 'sm', title: `Run de ${selInfo}`, onclick: act('run'), ...(nChecked ? {} : { disabled: '' }) }, 'Run'),
      el('button', { class: 'sm danger', title: 'Detiene los repos marcados del grupo que están en ejecución', onclick: (ev) => {
        ev.preventDefault(); ev.stopPropagation();
        checkedRunning.forEach((r) => stop(r.name));
      }, ...(checkedRunning.length ? {} : { disabled: '' }) }, 'Detener'),
    ),
  );
  const d = el('details', { class: 'group' }, summary, ...repos.map(repoCard));
  d.open = !state.collapsed.has(g);
  d.addEventListener('toggle', () => {
    if (d.open === !state.collapsed.has(g)) return; // toggle provocado al pintar, no por el usuario
    d.open ? state.collapsed.delete(g) : state.collapsed.add(g);
    saveCollapsed();
    const all = [...document.querySelectorAll('#repos > details.group')].every((x) => !x.open);
    setGroupsBtn(all);
  });
  return d;
}

export function repoCard(r) {
  {
    const running = r.status === 'running' || r.status === 'stopping'; // ocupado: sin acciones nuevas
    const cb = el('input', { type: 'checkbox', onclick: (ev) => ev.stopPropagation(), onchange: (ev) => {
      ev.target.checked ? state.checked.add(r.name) : state.checked.delete(r.name);
      $('#selectAll').checked = state.checked.size === state.repos.length;
      updateSummaries();
      if (state.repos.some((x) => x.group)) render(); // actualiza el checkbox del grupo (marcado / indeterminado)
    } });
    cb.checked = state.checked.has(r.name);
    const act = (a) => (ev) => { ev.stopPropagation(); runAction(a, [r.name]); };
    const meta = el('div', { class: 'meta' },
      r.cloned ? el('span', { class: 'badge branch-badge', title: r.upstream ? 'upstream: ' + r.upstream : 'sin upstream (push lo publicará con -u)' }, icon('branch'), r.branch || '?') : el('span', { class: 'badge warn' }, 'sin clonar'),
      r.locked ? el('span', { class: 'badge warn lock-badge', title: 'Existe .git/index.lock: git cree que otra operación está en curso y rechaza commit/pull/checkout. Suele quedar al cortar un git a mitad (cerrar el panel, Detener o mfs kill durante un pull o commit).' }, icon('lock'), `bloqueado${r.lockAge >= 60 ? ` (${Math.round(r.lockAge / 60)} min)` : ''}`) : null,
      r.locked ? el('button', { class: 'sm', title: 'Quitar el bloqueo .git/index.lock', onclick: (ev) => { ev.stopPropagation(); unlockRepo(r); }, ...(running ? { disabled: '' } : {}) }, 'Desbloquear') : null,
      r.cloned && r.changes ? el('span', { class: 'badge warn', title: 'Archivos modificados o nuevos sin commit' }, `● ${r.changes} cambio${r.changes > 1 ? 's' : ''}`) : null,
      r.cloned && r.ahead ? el('span', { class: 'badge', title: 'Commits pendientes de push' }, `↑${r.ahead}`) : null,
      r.cloned && r.behind ? el('span', { class: 'badge', title: 'Commits en el remoto por traer (pull)' }, `↓${r.behind}`) : null,
      r.cloned ? (r.hasDeps ? el('span', { class: 'badge' }, 'node_modules ✓') : el('span', { class: 'badge warn' }, 'sin dependencias')) : null,
      r.isNew ? el('span', { class: 'badge' }, '#NEW ventana externa') : null,
      el('span', { title: r.url }, r.command),
      portNode(r),
      elapsedNode(r),
    );
    const open = (target) => (ev) => { ev.stopPropagation(); openRepo(r.name, target); };
    const compactPort = portNode(r); // en vista compacta, el enlace al puerto va junto al estado
    if (compactPort) compactPort.classList.add('port-compact');
    const card = el('div', {
      class: `card status-${r.status}` + (state.selected === r.name ? ' selected' : ''), 'data-repo': r.name, tabindex: '0',
      'aria-label': `${r.name}: ${STATUS_LABEL[r.status] || r.status}`, onclick: () => selectRepo(r.name),
    },
      el('div', { class: 'top' }, cb, el('span', { class: 'name', title: r.url }, r.name), healthNode(r), compactPort, statusNode(r),
        el('span', { class: 'act-open' },
          el('button', { class: 'sm icon-only', title: 'Abrir en VS Code (O)', 'aria-label': `Abrir ${r.name} en VS Code`, onclick: open('code'), ...(r.cloned ? {} : { disabled: '' }) }, icon('code')),
          el('button', { class: 'sm icon-only', title: 'Abrir la carpeta', 'aria-label': `Abrir la carpeta de ${r.name}`, onclick: open('folder'), ...(r.cloned ? {} : { disabled: '' }) }, icon('folder')),
        )),
      meta,
      el('div', { class: 'actions' },
        el('button', { class: 'sm', title: 'Pull (P)', onclick: act('pull'), ...(running ? { disabled: '' } : {}) }, 'Pull'),
        el('button', { class: 'sm', title: 'Install (I)', onclick: act('install'), ...(running || !r.cloned ? { disabled: '' } : {}) }, 'Install'),
        el('button', { class: 'sm', title: 'Run (R)', onclick: act('run'), ...(running || !r.cloned ? { disabled: '' } : {}) }, 'Run'),
        el('button', { class: 'sm danger', title: 'Detener (D)', onclick: (ev) => { ev.stopPropagation(); stop(r.name); }, ...(r.status === 'running' ? {} : { disabled: '' }) }, 'Detener'),
        el('span', { class: 'sep act-git' }),
        el('button', { class: 'sm act-git', title: 'git status', onclick: act('status'), ...(running || !r.cloned ? { disabled: '' } : {}) }, 'Cambios'),
        el('button', { class: 'sm act-git', title: 'git add . + commit', onclick: (ev) => { ev.stopPropagation(); openCommit([r.name]); }, ...(running || !r.cloned ? { disabled: '' } : {}) }, 'Commit'),
        el('button', { class: 'sm act-git', title: 'git push', onclick: (ev) => { ev.stopPropagation(); gitPush([r.name]); }, ...(running || !r.cloned ? { disabled: '' } : {}) }, 'Push'),
      ),
    );
    return card;
  }
}

export function updateActivityIndicator() {
  updateSummaries(); // selección y repos en ejecución cambian en cada render
  const count = state.repos.filter((r) => r.status === 'running' || r.status === 'stopping').length;
  const indicator = $('#matrixStatus');
  indicator.hidden = count === 0;
  if (count) $('#matrixText').textContent = count === 1 ? '1 comando en ejecución' : `${count} comandos en ejecución`;
}

export async function selectRepo(name) {
  state.selected = name;
  $('#logTitle').textContent = name;
  render();
  const { lines, fromDisk, savedAt } = await api('/api/log?repo=' + encodeURIComponent(name));
  const head = fromDisk && lines.length ? `── log guardado de la última ejecución (${new Date(savedAt).toLocaleString()}) ──` : '';
  setLog(lines, head);
}

export async function runAction(action, names, extra = {}) {
  if (!names.length) return toast('No hay repos seleccionados');
  const branch = $('#branch').value.trim();
  const installCmd = $('#installCmd').value.trim();
  const runCmd = action === 'run' ? $('#runCmd').value.trim() : '';
  // "Run con" ejecuta un comando propio en todos los repos elegidos a la vez: vista previa y confirmación.
  // Varios repos → confirmar; comando destructivo (incluso en uno) → escribir EJECUTAR.
  if (runCmd) {
    const preview = `Comando:  ${runCmd}\n\nSe ejecutará a la vez en ${names.length} repo(s):\n${names.map((n) => '  · ' + n).join('\n')}`;
    if (isDangerousCmd(runCmd)) {
      const typed = await ask({
        title: '⚠ Comando destructivo',
        message: `${preview}\n\nParece borrar archivos, reescribir historial git o tocar discos, y no se puede deshacer.\nEscribe EJECUTAR para confirmar.`,
        okText: `Ejecutar en ${names.length} repo(s)`, danger: true, input: true,
      });
      if (typed === null) return;
      if (typed !== 'EJECUTAR') return toast('Cancelado: no escribiste EJECUTAR');
      extra = { ...extra, confirmDanger: true };
    } else if (names.length > 1) {
      const ok = await ask({ title: 'Run con comando personalizado', message: preview, okText: `Ejecutar en ${names.length} repos` });
      if (!ok) return;
    }
  }
  localStorage.setItem('mfs.branch', branch);
  localStorage.setItem('mfs.installCmd', installCmd);
  if (action === 'run') saveRunCmd();
  try {
    const r = await api('/api/action', { method: 'POST', body: JSON.stringify({ action, repos: names, branch, installCmd, runCmd, list: listName(), ...extra }) });
    toast(`${ACTION_LABEL[action] || action}: ${r.started.length} iniciado(s)` + (r.busy.length ? `, ${r.busy.length} ocupado(s)` : ''));
    if (r.started[0] && (!state.selected || !r.started.includes(state.selected))) selectRepo(r.started[0]);
  } catch (e) { toast(e.message); }
}

export async function stop(name) {
  try { await api('/api/stop', { method: 'POST', body: JSON.stringify(name ? { repo: name } : { all: true }) }); }
  catch (e) { toast(e.message); }
}
