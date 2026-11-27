// Punto de entrada: enlaza los eventos globales y arranca el panel.
import { $, api, state, listName, loadCollapsed, saveCollapsed, saveRunCmd } from './core.js';
import { icon } from './icons.js';
import { loadRepos, render, runAction, stop, setGroupsBtn } from './repos.js';
import './git.js';
import { loadRunCmd, showTokenState } from './sidebar.js';
import './tools.js';
import { loadLists, rememberList } from './lists.js';
import { connectStream } from './stream.js';

$('#browseBtn').prepend(icon('folder'));
$('#refresh').append(icon('refresh'));
$('#sidebarToggle').append(icon('menu'));
$('header [data-action=run]').prepend(icon('play'));
$('#stopAll').prepend(icon('stop'));
setGroupsBtn(false);

// ── Eventos ──
// Botones de acción global: en el panel lateral (Pull/Install/Updeps) y en la barra superior (Run)
document.querySelectorAll('#sidebar [data-action], header [data-action]').forEach((b) =>
  b.addEventListener('click', () => runAction(b.dataset.action, state.repos.map((r) => r.name).filter((n) => state.checked.has(n))))
);
$('#stopAll').onclick = () => stop(null);
$('#refresh').onclick = loadRepos;
$('#selectAll').onchange = (ev) => { state.checked = ev.target.checked ? new Set(state.repos.map((r) => r.name)) : new Set(); render(); };
$('#list').onchange = () => { rememberList(listName()); loadLists(); loadCollapsed(); state.first = true; loadRepos(); };
$('#toggleGroups').onclick = () => {
  const names = [...new Set(state.repos.map((r) => r.group || 'Sin grupo'))];
  const allCollapsed = names.every((g) => state.collapsed.has(g));
  state.collapsed = allCollapsed ? new Set() : new Set(names);
  saveCollapsed(); render();
};
$('#list').addEventListener('change', loadRunCmd);
$('#runCmd').addEventListener('change', saveRunCmd);
$('#clearLog').onclick = () => { $('#log').textContent = ''; };

// Frase al azar en el tooltip del título 👾 (una por carga)
const BRAND_QUIPS = [
  'Ningún repo fue maltratado (casi)',
  'Encodeado con lágrimas de dev',
  'Push bajo su propia responsabilidad',
  'Domando repos desde que git es git',
  'Funciona en mi máquina™',
  'node_modules: el agujero negro oficial',
  'Hoy compila. Mañana, quién sabe',
  'Commit temprano, commit a menudo, push con fe',
  'Detener todo: el botón favorito de los viernes',
  'Si no está en el .txt, no existe',
  'Insert coin para hacer pull',
];
const brandQuip = BRAND_QUIPS[Math.floor(Math.random() * BRAND_QUIPS.length)];
const brandTitle = (workDir) => brandQuip + (workDir ? '\nDirectorio de trabajo: ' + workDir : '');

(async function init() {
  $('#branch').value = localStorage.getItem('mfs.branch') || '';
  $('#installCmd').value = localStorage.getItem('mfs.installCmd') || '';
  $('#brand').title = brandTitle();
  try {
    const info = await api('/api/info'); $('#workdir').textContent = info.workDir;
    $('#brand').title = brandTitle(info.workDir);
    $('#list').title += '\nDirectorio de trabajo: ' + info.workDir;
    $('#version').textContent = 'v' + info.version;
    showTokenState(info.hasToken);
    // "mfs ui otra/lista.txt" tiene prioridad; si no, la última lista usada
    $('#list').value = info.defaultList !== 'listRep.txt' ? info.defaultList : (localStorage.getItem('mfs.list') || 'listRep.txt');
  } catch { $('#list').value = 'listRep.txt'; }
  loadRunCmd(); loadCollapsed();
  await loadLists();
  await loadRepos();
  connectStream();
})();
