// Paleta de comandos (Ctrl+K) y atajo "/" para el filtro de repos.
// Cada comando reutiliza los botones y funciones que ya existen; no hay lógica nueva de acciones.
import { $, el, state } from './core.js';

const norm = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

// Comandos disponibles ahora mismo (se recalculan al abrir: dependen de los repos y de qué está visible)
function commands() {
  const click = (sel) => () => document.querySelector(sel)?.click();
  const cmds = [
    { label: 'Run en los marcados', hint: 'Acción', run: click('header [data-action=run]') },
    { label: 'Pull en los marcados', hint: 'Repos', run: click('#sidebar [data-action=pull]') },
    { label: 'Install en los marcados', hint: 'Repos', run: click('#sidebar [data-action=install]') },
    { label: 'Updeps en los marcados', hint: 'Repos', run: click('#sidebar [data-action=updeps]') },
    { label: 'Detener todo', hint: 'Acción', run: click('#stopAll') },
    { label: 'Ver cambios (git status)', hint: 'Git', run: click('#sidebar [data-git=status]') },
    { label: 'Commit…', hint: 'Git', run: click('#sidebar [data-git=commit]') },
    { label: 'Push', hint: 'Git', run: click('#sidebar [data-git=push]') },
    { label: 'Checkout a la rama del panel', hint: 'Git', run: click('#sidebar [data-git=checkout]') },
    { label: 'Nueva rama…', hint: 'Git', run: click('#sidebar [data-git=newbranch]') },
    { label: 'cURL', hint: 'Herramientas', run: click('#curlBtn') },
    { label: 'Base64 / Formatear JSON', hint: 'Herramientas', run: click('#codecBtn') },
    { label: 'Procesos Node', hint: 'Herramientas', run: click('#psBtn') },
    { label: 'Ayuda (README)', hint: 'Herramientas', run: click('#helpBtn') },
    { label: 'Buscar lista .txt…', hint: 'Lista', run: click('#browseBtn') },
    { label: 'Editar lista', hint: 'Lista', run: click('#edit') },
    { label: 'Recargar estado', hint: 'Lista', run: click('#refresh') },
    { label: 'Filtrar repos', hint: '/', run: () => { $('#repoFilter').focus(); $('#repoFilter').select(); } },
    { label: 'Buscar en el log', hint: 'Log', run: () => { $('#logSearch').focus(); $('#logSearch').select(); } },
    { label: 'Mostrar u ocultar el panel lateral', hint: 'Vista', run: click('#sidebarToggle') },
    { label: 'LAUNCH PAD: información y apariencia', hint: 'Vista', run: () => $('#mfsInfo').showPopover() },
  ];
  if (!$('#toggleGroups').hidden) cmds.push({ label: 'Plegar o desplegar los grupos', hint: 'Vista', run: click('#toggleGroups') });
  for (const r of state.repos) cmds.push({ label: `Ver log: ${r.name}`, hint: r.group || 'Repo', run: () => import('./repos.js').then((m) => m.selectRepo(r.name)) });
  return cmds;
}

// Filtra por palabras (todas deben aparecer, sin tildes ni mayúsculas). Pura, para los tests.
export function filterCommands(cmds, query) {
  const terms = norm(query).split(/\s+/).filter(Boolean);
  return cmds.filter((c) => terms.every((t) => norm(`${c.label} ${c.hint}`).includes(t)));
}

if (typeof document !== 'undefined') {
  const dlg = $('#cmdPalette'), input = $('#cmdInput'), list = $('#cmdList');
  let all = [], shown = [], active = 0;

  function paint() {
    shown = filterCommands(all, input.value).slice(0, 50);
    active = Math.min(active, Math.max(0, shown.length - 1));
    list.replaceChildren(...(shown.length ? shown.map((c, i) => el('li', {
      class: 'cmd-item' + (i === active ? ' active' : ''), role: 'option', 'aria-selected': String(i === active),
      onmousemove: () => { if (active !== i) { active = i; paint(); } },
      onclick: () => exec(c),
    }, el('span', { class: 'cmd-label' }, c.label), el('span', { class: 'cmd-hint' }, c.hint))) : [el('li', { class: 'cmd-empty' }, 'Ningún comando coincide')]));
    list.querySelector('.active')?.scrollIntoView({ block: 'nearest' });
  }
  function exec(c) { dlg.close(); setTimeout(c.run, 0); }
  function open() {
    if (dlg.open) return;
    all = commands(); active = 0; input.value = '';
    paint(); dlg.showModal(); input.focus();
  }

  input.addEventListener('input', () => { active = 0; paint(); });
  input.addEventListener('keydown', (ev) => {
    if (ev.key === 'ArrowDown') { ev.preventDefault(); active = (active + 1) % Math.max(1, shown.length); paint(); }
    else if (ev.key === 'ArrowUp') { ev.preventDefault(); active = (active - 1 + shown.length) % Math.max(1, shown.length); paint(); }
    else if (ev.key === 'Enter') { ev.preventDefault(); if (shown[active]) exec(shown[active]); }
  });
  dlg.addEventListener('click', (ev) => { if (ev.target === dlg) dlg.close(); }); // clic fuera

  const typing = (t) => t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName));
  document.addEventListener('keydown', (ev) => {
    if ((ev.ctrlKey || ev.metaKey) && ev.key.toLowerCase() === 'k') { ev.preventDefault(); open(); return; }
    // "/" enfoca el filtro de repos (si no se está escribiendo en otro campo ni hay un diálogo abierto)
    if (ev.key === '/' && !ev.ctrlKey && !ev.metaKey && !typing(ev.target) && !document.querySelector('dialog[open]')) {
      ev.preventDefault(); $('#repoFilter').focus(); $('#repoFilter').select();
    }
  });
}
