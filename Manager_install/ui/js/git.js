// Acciones git: commit, push, desbloqueo, nueva rama y checkout.
import { $, api, toast, listName, selectedNames, repoBy } from './core.js';
import { ask } from './dialogs.js';
import { runAction, loadRepos } from './repos.js';

// ── Git ──
let commitTargets = [];

export function openCommit(names) {
  const repos = names.map(repoBy).filter((r) => r && r.cloned);
  if (!repos.length) return toast('No hay repos clonados seleccionados');
  const withChanges = repos.filter((r) => r.changes > 0);
  const without = repos.filter((r) => !r.changes);
  commitTargets = withChanges.map((r) => r.name);
  $('#commitRepos').textContent =
    (withChanges.length ? 'Se hará commit en:\n' + withChanges.map((r) => `  ${r.name}  (${r.branch})  ● ${r.changes} cambio(s)`).join('\n') : 'Ningún repo seleccionado tiene cambios.') +
    (without.length ? '\n\nSin cambios (se omiten):\n' + without.map((r) => `  ${r.name}`).join('\n') : '');
  $('#commitOk').disabled = !withChanges.length;
  $('#commitMsg').value = localStorage.getItem('mfs.commitMsg') || '';
  $('#commitDialog').showModal();
  $('#commitMsg').focus();
  if (withChanges.length) showCommitDiff(withChanges, without);
}

// Detalle de lo que entra en el commit: archivos (status --porcelain) y resumen de líneas (diff --stat)
export async function showCommitDiff(withChanges, without) {
  const token = (showCommitDiff.token = {});
  const parts = await Promise.all(withChanges.map(async (r) => {
    try {
      const d = await api(`/api/diffstat?repo=${encodeURIComponent(r.name)}&list=${encodeURIComponent(listName())}`);
      const files = d.files.length ? d.files.map((f) => '    ' + f).join('\n') : '    (sin cambios)';
      const stat = d.stat ? '\n' + d.stat.split('\n').map((l) => '    ' + l.trim()).slice(-1).join('\n') : '';
      return `■ ${r.name}  (${r.branch})\n${files}${stat}`;
    } catch (e) { return `■ ${r.name}  (${r.branch})\n    ${e.message}`; }
  }));
  if (showCommitDiff.token !== token || !$('#commitDialog').open) return; // el diálogo se cerró o se reabrió
  $('#commitRepos').textContent = 'Se hará commit en:\n\n' + parts.join('\n\n') +
    (without.length ? '\n\nSin cambios (se omiten):\n' + without.map((r) => `  ${r.name}`).join('\n') : '');
}
$('#commitCancel').onclick = () => $('#commitDialog').close();
$('#commitOk').onclick = () => {
  const msg = $('#commitMsg').value.trim();
  if (!msg) return toast('Escribe el mensaje del commit');
  localStorage.setItem('mfs.commitMsg', msg);
  $('#commitDialog').close();
  runAction('commit', commitTargets, { commitMsg: msg });
};

export async function unlockRepo(r) {
  const ok = await ask({
    title: 'Quitar bloqueo de git',
    message: `${r.name} tiene un archivo .git/index.lock${r.lockAge != null ? ` (de hace ${r.lockAge >= 60 ? Math.round(r.lockAge / 60) + ' min' : r.lockAge + ' s'})` : ''}.\n\n` +
      'Git lo crea mientras trabaja y lo borra al terminar. Si quedó abandonado (un git cortado a mitad), git rechaza commit, pull y checkout en este repo.\n\n' +
      'Quítalo solo si no hay ningún git trabajando en este repo (por ejemplo, un commit abierto en VS Code).',
    okText: 'Quitar bloqueo',
  });
  if (!ok) return;
  try {
    const res = await api('/api/unlock', { method: 'POST', body: JSON.stringify({ repo: r.name, list: listName() }) });
    toast(res.unlocked ? `Bloqueo quitado en ${r.name}` : res.message);
    loadRepos();
  } catch (e) { toast(e.message); }
}

export async function gitPush(names) {
  const repos = names.map(repoBy).filter((r) => r && r.cloned);
  const pending = repos.filter((r) => r.ahead > 0 || !r.upstream);
  if (!pending.length) return toast('Nada que subir en los repos seleccionados');
  const lines = pending.map((r) => `• ${r.name} (${r.branch}) ${r.upstream ? '↑' + r.ahead : 'nueva rama → push -u'}`).join('\n');
  const ok = await ask({ title: 'Push (sin --force)', message: `Se hará git push en:\n\n${lines}`, okText: 'Hacer push' });
  if (ok) runAction('push', pending.map((r) => r.name));
}

const BRANCH_NAME_RE = /^[\w./-]{1,200}$/;
let newBranchTargets = [];

function updateNewBranchPreview() {
  const name = $('#newBranchName').value.trim();
  const useSpecificBase = $('#newBranchBaseMode').value === 'specific';
  const base = $('#newBranchBase').value.trim();
  const repos = newBranchTargets.map(repoBy).filter(Boolean);
  const repoLines = repos.map((r) => `  • ${r.name} — actual: ${r.branch || 'desconocida'}${r.changes ? ` · ${r.changes} cambio(s) sin commit` : ''}`);
  const dirty = repos.filter((r) => r.changes > 0).map((r) => r.name);
  const baseText = useSpecificBase ? (base || '(indica la rama base)') : 'rama actual de cada repo';
  $('#newBranchPreview').textContent =
    `Nueva rama: ${name || '(escribe un nombre)'}\nCrear desde: ${baseText}\n\nRepos seleccionados:\n${repoLines.join('\n')}`;
  $('#newBranchDirtyWarning').hidden = !dirty.length;
  $('#newBranchDirtyWarning').textContent = dirty.length ? `Atención: hay cambios sin commit en ${dirty.join(', ')}.` : '';
  $('#newBranchCreate').disabled = !BRANCH_NAME_RE.test(name) || (useSpecificBase && !BRANCH_NAME_RE.test(base)) || !repos.length;
}

export function openNewBranchDialog() {
  const names = selectedNames();
  if (!names.length) return toast('No hay repos seleccionados');
  newBranchTargets = names;
  $('#newBranchName').value = '';
  $('#newBranchBaseMode').value = 'current';
  $('#newBranchBase').value = '';
  $('#newBranchBaseWrap').hidden = true;
  updateNewBranchPreview();
  $('#newBranchDialog').showModal();
  $('#newBranchName').focus();
}

function submitNewBranch() {
  const branch = $('#newBranchName').value.trim();
  const useSpecificBase = $('#newBranchBaseMode').value === 'specific';
  const baseBranch = useSpecificBase ? $('#newBranchBase').value.trim() : '';
  if (!BRANCH_NAME_RE.test(branch)) return toast('Escribe un nombre de rama válido');
  if (useSpecificBase && !BRANCH_NAME_RE.test(baseBranch)) return toast('Escribe una rama base válida');
  const names = [...newBranchTargets];
  $('#newBranchDialog').close();
  runAction('newbranch', names, { branch, baseBranch });
}

$('#newBranchName').addEventListener('input', updateNewBranchPreview);
$('#newBranchBase').addEventListener('input', updateNewBranchPreview);
$('#newBranchBaseMode').onchange = () => {
  const specific = $('#newBranchBaseMode').value === 'specific';
  $('#newBranchBaseWrap').hidden = !specific;
  if (specific && !$('#newBranchBase').value.trim()) $('#newBranchBase').value = $('#branch').value.trim();
  updateNewBranchPreview();
};
$('#newBranchName').onkeydown = $('#newBranchBase').onkeydown = (ev) => {
  if (ev.key === 'Enter') { ev.preventDefault(); submitNewBranch(); }
};
$('#newBranchCancel').onclick = () => $('#newBranchDialog').close();
$('#newBranchCreate').onclick = submitNewBranch;

async function gitBranchAction(action) {
  const branch = $('#branch').value.trim();
  if (!branch) return toast('Escribe la rama en el campo "Rama (pull/checkout)"');
  const names = selectedNames();
  if (!names.length) return toast('No hay repos seleccionados');
  const dirty = names.map(repoBy).filter((r) => r && r.changes > 0).map((r) => r.name);
  const msg = `Cambiar ${names.length} repo(s) a la rama "${branch}".`;
  const warn = dirty.length ? `\n\nAtención: tienen cambios sin commit: ${dirty.join(', ')}` : '';
  const ok = await ask({
    title: 'Checkout',
    message: msg + warn,
    okText: 'Cambiar de rama',
  });
  if (ok) runAction(action, names);
}

document.querySelectorAll('#sidebar [data-git]').forEach((b) => b.addEventListener('click', () => {
  const a = b.dataset.git;
  if (a === 'status') runAction('status', selectedNames());
  else if (a === 'commit') openCommit(selectedNames());
  else if (a === 'push') gitPush(selectedNames());
  else if (a === 'newbranch') openNewBranchDialog();
  else gitBranchAction(a);
}));
