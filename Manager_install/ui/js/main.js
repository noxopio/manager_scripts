// Punto de entrada: enlaza los eventos globales y arranca el panel.
import { $, api, state, listName, loadCollapsed, saveCollapsed, saveRunCmd } from './core.js';
import { icon } from './icons.js';
import { loadRepos, render, runAction, stop, setGroupsBtn } from './repos.js';
import './git.js';
import { loadRunCmd, showTokenState, renderMfsInfo } from './sidebar.js';
import './tools.js';
import './curl.js';
import { loadLists, rememberList } from './lists.js';
import { connectStream } from './stream.js';
import { pickQuip } from './quips.js';
import './idle.js';
import './workday.js';

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

// Tooltip del 👾: frase según el estado del panel, nueva en cada hover (ver quips.js)
let brandWorkDir = '';
const brandTitle = () => pickQuip(state.repos) + (brandWorkDir ? '\nDirectorio de trabajo: ' + brandWorkDir : '');
$('#brand').addEventListener('mouseenter', () => { $('#brand').title = brandTitle(); });

(async function init() {
  $('#branch').value = localStorage.getItem('mfs.branch') || '';
  $('#installCmd').value = localStorage.getItem('mfs.installCmd') || '';
  $('#brand').title = brandTitle();
  try {
    const info = await api('/api/info'); $('#workdir').textContent = info.workDir;
    brandWorkDir = info.workDir;
    $('#brand').title = brandTitle();
    $('#list').title += '\nDirectorio de trabajo: ' + info.workDir;
    renderMfsInfo(info);
    showTokenState(info.hasToken);
    // "mfs ui otra/lista.txt" tiene prioridad; si no, la última lista usada
    $('#list').value = info.defaultList !== 'listRep.txt' ? info.defaultList : (localStorage.getItem('mfs.list') || 'listRep.txt');
  } catch { $('#list').value = 'listRep.txt'; }
  loadRunCmd(); loadCollapsed();
  await loadLists();
  await loadRepos();
  connectStream();
})();
