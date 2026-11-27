// Lista de repos: carga, pintado (cards y grupos), selección, log y acciones.
import { $, el, api, toast, state, STATUS_LABEL, COMPILE_LABEL, ACTION_LABEL, listName, saveCollapsed, saveRunCmd, isBusy } from './core.js';
import { icon, emptyState } from './icons.js';
import { updateSummaries } from './sidebar.js';
import { openCommit, gitPush, unlockRepo } from './git.js';

export async function loadRepos() {
  try {
    const data = await api('/api/repos?list=' + encodeURIComponent(listName()));
    state.repos = data.repos;
    if (state.first || $('#selectAll').checked) state.checked = new Set(data.repos.map((r) => r.name));
    state.first = false;
    render(data.missing ? `No existe ${data.file}. Usa "Editar lista" para crearlo.` : null);
  } catch (e) { toast(e.message); }
}

let refreshTimer;
export const scheduleRefresh = () => { clearTimeout(refreshTimer); refreshTimer = setTimeout(loadRepos, 600); };

export function statusNode(r) {
  if (r.status === 'running' && r.action === 'run' && r.compile) {
    return el('span', { class: 'status ' + r.compile }, el('span', { class: 'dot' }), `${COMPILE_LABEL[r.compile]} · run`);
  }
  const label = STATUS_LABEL[r.status] + (r.action && r.status !== 'idle' ? ` · ${ACTION_LABEL[r.action]}` : '');
  return el('span', { class: 'status ' + r.status }, el('span', { class: 'dot' }), label);
}

// Enlace al puerto solo cuando ya compiló; mientras tanto, un aviso sin enlace.
export function portNode(r) {
  if (!r.port || r.status !== 'running') return null;
  if (r.compile === 'compiling') {
    return el('span', { class: 'badge warn', title: 'webpack anunció el puerto pero aún está compilando; espera a que diga "listo"' }, `compilando… :${r.port}`);
  }
  return el('a', { href: 'http://localhost:' + r.port, target: '_blank', onclick: (ev) => ev.stopPropagation() }, 'localhost:' + r.port);
}

export function render(emptyMsg) {
  const box = $('#repos'); box.innerHTML = '';
  updateActivityIndicator();
  if (!state.repos.length) {
    box.append(emptyState('repo', emptyMsg ? 'No se pudo cargar la lista' : 'No hay repos activos', emptyMsg || 'Agrega repositorios a la lista para verlos aquí.'));
    $('#toggleGroups').hidden = true;
    return;
  }
  const hasGroups = state.repos.some((r) => r.group);
  $('#toggleGroups').hidden = !hasGroups;
  if (!hasGroups) { for (const r of state.repos) box.append(repoCard(r)); return; }
  // Agrupa respetando el orden del .txt; los repos antes de la primera cabecera van a "Sin grupo"
  const groups = new Map();
  for (const r of state.repos) {
    const g = r.group || 'Sin grupo';
    if (!groups.has(g)) groups.set(g, []);
    groups.get(g).push(r);
  }
  for (const [g, repos] of groups) box.append(groupNode(g, repos));
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
    );
    const card = el('div', { class: `card status-${r.status}` + (state.selected === r.name ? ' selected' : ''), onclick: () => selectRepo(r.name) },
      el('div', { class: 'top' }, cb, el('span', { class: 'name', title: r.url }, r.name), statusNode(r)),
      meta,
      el('div', { class: 'actions' },
        el('button', { class: 'sm', onclick: act('pull'), ...(running ? { disabled: '' } : {}) }, 'Pull'),
        el('button', { class: 'sm', onclick: act('install'), ...(running || !r.cloned ? { disabled: '' } : {}) }, 'Install'),
        el('button', { class: 'sm', onclick: act('run'), ...(running || !r.cloned ? { disabled: '' } : {}) }, 'Run'),
        el('button', { class: 'sm danger', onclick: (ev) => { ev.stopPropagation(); stop(r.name); }, ...(r.status === 'running' ? {} : { disabled: '' }) }, 'Detener'),
        el('span', { class: 'sep' }),
        el('button', { class: 'sm', title: 'git status', onclick: act('status'), ...(running || !r.cloned ? { disabled: '' } : {}) }, 'Cambios'),
        el('button', { class: 'sm', title: 'git add . + commit', onclick: (ev) => { ev.stopPropagation(); openCommit([r.name]); }, ...(running || !r.cloned ? { disabled: '' } : {}) }, 'Commit'),
        el('button', { class: 'sm', title: 'git push', onclick: (ev) => { ev.stopPropagation(); gitPush([r.name]); }, ...(running || !r.cloned ? { disabled: '' } : {}) }, 'Push'),
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
  const head = fromDisk && lines.length ? `── log guardado de la última ejecución (${new Date(savedAt).toLocaleString()}) ──\n` : '';
  $('#log').textContent = head + lines.join('\n') + (lines.length ? '\n' : '');
  if ($('#follow').checked) $('#log').scrollTop = $('#log').scrollHeight;
}

export async function runAction(action, names, extra = {}) {
  if (!names.length) return toast('No hay repos seleccionados');
  const branch = $('#branch').value.trim();
  const installCmd = $('#installCmd').value.trim();
  const runCmd = action === 'run' ? $('#runCmd').value.trim() : '';
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
