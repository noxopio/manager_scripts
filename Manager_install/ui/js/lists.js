// Listas .txt: datalist, recientes, explorador de archivos, editor e importación de GitHub.
import { $, el, api, toast, state, listName, loadCollapsed } from './core.js';
import { icon, emptyState } from './icons.js';
import { ask } from './dialogs.js';
import { loadRepos } from './repos.js';
import { loadRunCmd } from './sidebar.js';

export async function loadLists() {
  const { files } = await api('/api/lists');
  const recent = JSON.parse(localStorage.getItem('mfs.recentLists') || '[]');
  const dl = $('#lists'); dl.innerHTML = '';
  for (const f of [...new Set([...files, ...recent])]) { const o = document.createElement('option'); o.value = f; dl.appendChild(o); }
}
export function rememberList(name) {
  localStorage.setItem('mfs.list', name);
  const recent = JSON.parse(localStorage.getItem('mfs.recentLists') || '[]').filter((x) => x !== name);
  localStorage.setItem('mfs.recentLists', JSON.stringify([name, ...recent].slice(0, 10)));
}

// Equivalente a "mfs list": importar de GitHub o plantilla
$('#ghImport').onclick = async () => {
  const org = $('#ghOrg').value.trim();
  if (!org) return toast('Escribe la organización o usuario de GitHub');
  if ($('#editorText').value.trim() && !(await ask({
    title: 'Reemplazar contenido del editor',
    message: 'La lista importada de GitHub reemplazará el contenido actual del editor.\nNo se guarda en disco hasta pulsar Guardar.',
    okText: 'Importar',
  }))) return;
  $('#ghImport').disabled = true; $('#ghImport').textContent = 'Importando...';
  try {
    const { urls } = await api('/api/github', { method: 'POST', body: JSON.stringify({ org, token: $('#ghToken').value }) });
    $('#editorText').value = urls.join('\n') + '\n';
    toast(`${urls.length} repos importados. Revisa y pulsa Guardar.`);
  } catch (e) { toast(e.message); }
  finally { $('#ghImport').disabled = false; $('#ghImport').textContent = 'Importar de GitHub'; }
};
$('#tplBtn').onclick = async () => {
  if ($('#editorText').value.trim() && !(await ask({
    title: 'Reemplazar contenido del editor',
    message: 'La plantilla de ejemplo reemplazará el contenido actual del editor.\nNo se guarda en disco hasta pulsar Guardar.',
    okText: 'Usar plantilla',
  }))) return;
  $('#editorText').value = [
    '# EXCLUDE ## Archivo de ejemplo para listar repositorios.',
    '# EXCLUDE # Cada línea debe contener la URL de un repositorio.',
    "# EXCLUDE # Para excluir repositorios específicos, agrega '#EXCLUDE'.",
    "# EXCLUDE # Utiliza '#NEW' para abrir el repositorio en una nueva ventana de terminal.",
    '# EXCLUDE # Se puede indicar el comando a ejecutar al final de la URL.',
    "# EXCLUDE # '## Nombre' agrupa en el panel los repos de debajo (la terminal lo ignora).",
    "# EXCLUDE # '#> health: /ruta' bajo un repo: el panel comprueba esa ruta mientras corre (punto verde/rojo).",
    '## Grupo A',
    'https://github.com/usuario/repo1.git #NEW',
    'https://github.com/usuario/repo2.git',
    '## Grupo B',
    'https://github.com/usuario/repo3.git #EXCLUDE',
    'https://github.com/usuario/repo4.git npm run dev #NEW',
    'https://github.com/usuario/repo5.git npm run dev',
    '#> health: /health',
    '',
  ].join('\n');
};
// ── Explorador / buscador de listas .txt ──
const fs_ = { dir: null, parent: null, sep: '\\', selected: null, workDir: null };
function fsSelect(file) {
  fs_.selected = file;
  $('#fsSelected').textContent = file || 'Ningún archivo seleccionado';
  $('#fsUse').disabled = $('#fsUseEdit').disabled = !file;
  document.querySelectorAll('#fsList .fsitem').forEach((n) => n.classList.toggle('sel', n.dataset.file === file));
}
function fsItem(iconName, label, sub, { file, onopen } = {}) {
  const n = el('div', { class: 'fsitem' }, icon(iconName), el('span', { class: 'fs-label' }, label), sub ? el('span', { class: 'sub', title: sub }, sub) : null);
  if (file) {
    n.dataset.file = file;
    n.onclick = () => fsSelect(file);
    n.ondblclick = () => fsUse(file, false);
  } else if (onopen) n.onclick = onopen;
  return n;
}
async function fsOpen(dir) {
  try {
    const r = await api('/api/fs/list' + (dir ? '?dir=' + encodeURIComponent(dir) : ''));
    Object.assign(fs_, { dir: r.dir, parent: r.parent, sep: r.sep });
    $('#fsPath').value = r.dir; $('#fsUp').disabled = !r.parent;
    const box = $('#fsDrives'); box.innerHTML = '';
    for (const d of r.drives) box.append(el('button', { class: 'sm', onclick: () => fsOpen(d) }, d.replace(/\\$/, '')));
    const list = $('#fsList'); list.innerHTML = '';
    const join = (name) => r.dir.replace(/[\\/]$/, '') + r.sep + name;
    if (!r.entries.length) list.append(emptyState('folder', 'Carpeta vacía', 'No hay subcarpetas ni archivos .txt aquí.'));
    for (const e of r.entries) {
      list.append(e.type === 'dir' ? fsItem('folder', e.name, null, { onopen: () => fsOpen(join(e.name)) }) : fsItem('file', e.name, null, { file: join(e.name) }));
    }
    fsSelect(null);
  } catch (e) { toast(e.message); }
}
async function fsSearch() {
  const q = $('#fsQuery').value.trim();
  if (!q) return toast('Escribe parte del nombre del archivo');
  const list = $('#fsList'); list.innerHTML = ''; list.append(el('div', { class: 'empty' }, 'Buscando...'));
  try {
    const r = await api(`/api/fs/search?dir=${encodeURIComponent(fs_.dir || '')}&q=${encodeURIComponent(q)}`);
    list.innerHTML = '';
    if (!r.results.length) list.append(emptyState('search', 'No se encontraron archivos', `No hay .txt con "${q}" bajo ${r.root}`));
    for (const f of r.results) list.append(fsItem('file', f.split(/[\\/]/).pop(), f, { file: f }));
    if (r.truncated) list.append(el('div', { class: 'empty' }, 'Resultados truncados: afina el nombre o busca desde una carpeta más concreta.'));
    fsSelect(null);
  } catch (e) { list.innerHTML = ''; toast(e.message); }
}
async function fsUse(file, edit) {
  $('#list').value = file;
  loadRunCmd(); loadCollapsed();
  rememberList(file); loadLists(); state.first = true;
  $('#fsDialog').close();
  await loadRepos();
  if (edit) $('#edit').onclick();
}
$('#browseBtn').onclick = () => {
  const recent = JSON.parse(localStorage.getItem('mfs.recentLists') || '[]');
  const box = $('#fsRecent'); box.innerHTML = '';
  for (const f of recent) box.append(el('button', { class: 'sm', title: f, onclick: () => fsUse(f, false) }, f.split(/[\\/]/).pop()));
  $('#fsRecentRow').style.display = recent.length ? '' : 'none';
  $('#fsQuery').value = '';
  $('#fsDialog').showModal();
  fsOpen(fs_.dir);
};
$('#fsUp').onclick = () => fs_.parent && fsOpen(fs_.parent);
$('#fsGo').onclick = () => fsOpen($('#fsPath').value);
$('#fsPath').onkeydown = (ev) => { if (ev.key === 'Enter') fsOpen($('#fsPath').value); };
$('#fsHome').onclick = () => fsOpen(null);
$('#fsSearch').onclick = fsSearch;
$('#fsQuery').onkeydown = (ev) => { if (ev.key === 'Enter') fsSearch(); };
$('#fsCancel').onclick = () => $('#fsDialog').close();
$('#fsUse').onclick = () => fs_.selected && fsUse(fs_.selected, false);
$('#fsUseEdit').onclick = () => fs_.selected && fsUse(fs_.selected, true);
$('#fsNew').onclick = async () => {
  let name = (await ask({ title: 'Nuevo archivo .txt', message: `Se creará en:\n${fs_.dir}`, okText: 'Crear', input: true, value: 'listRep.txt' })) || '';
  if (!name) return;
  if (/[\\/:*?"<>|]/.test(name)) return toast('Nombre no válido');
  if (!name.toLowerCase().endsWith('.txt')) name += '.txt';
  fsUse(fs_.dir.replace(/[\\/]$/, '') + fs_.sep + name, true);
};

$('#edit').onclick = async () => {
  try {
    const { file, content } = await api('/api/list?list=' + encodeURIComponent(listName()));
    $('#editorTitle').textContent = file; $('#editorText').value = content; $('#editor').showModal();
  } catch (e) { toast(e.message); }
};
$('#editorCancel').onclick = () => $('#editor').close();
$('#editorSave').onclick = async () => {
  try {
    await api('/api/list', { method: 'PUT', body: JSON.stringify({ list: listName(), content: $('#editorText').value }) });
    $('#editor').close(); toast('Lista guardada'); state.first = true; loadRepos();
  } catch (e) { toast(e.message); }
};
