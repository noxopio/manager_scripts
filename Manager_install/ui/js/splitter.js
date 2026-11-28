// Divisor arrastrable entre la lista de repos y el log. Ratón/táctil (arrastrar), teclado (← →)
// y doble clic para volver al ancho por defecto. El ancho se guarda en este navegador.
import { $ } from './core.js';

const KEY = 'mfs.listWidth';
const MIN_LIST = 320;   // ancho mínimo de la lista
const MIN_LOG = 360;    // ancho mínimo que se deja al log
const STEP = 24;        // paso con el teclado

if (typeof document !== 'undefined') {
  const main = document.querySelector('main');
  const sp = $('#splitter');
  const list = document.querySelector('.list-panel');
  const splitterW = () => sp.getBoundingClientRect().width;
  const clamp = (px) => Math.round(Math.max(MIN_LIST, Math.min(px, main.clientWidth - MIN_LOG - splitterW())));
  const apply = (px) => {
    if (px == null) { main.style.removeProperty('--list-w'); sp.setAttribute('aria-valuenow', ''); return; }
    const w = clamp(px);
    main.style.setProperty('--list-w', `${w}px`);
    sp.setAttribute('aria-valuenow', String(w));
  };
  const save = () => { const w = parseInt(main.style.getPropertyValue('--list-w'), 10); if (w) localStorage.setItem(KEY, String(w)); };
  const enabled = () => getComputedStyle(sp).display !== 'none'; // en pantallas estrechas no hay divisor

  const saved = parseInt(localStorage.getItem(KEY) || '', 10);
  if (saved) requestAnimationFrame(() => enabled() && apply(saved));
  window.addEventListener('resize', () => { const w = parseInt(main.style.getPropertyValue('--list-w'), 10); if (w && enabled()) apply(w); });

  let drag = null;
  sp.addEventListener('pointerdown', (ev) => {
    if (ev.button !== 0) return;
    drag = { x: ev.clientX, w: list.getBoundingClientRect().width };
    sp.setPointerCapture(ev.pointerId);
    sp.classList.add('dragging');
    document.body.classList.add('resizing');
    ev.preventDefault();
  });
  sp.addEventListener('pointermove', (ev) => { if (drag) apply(drag.w + ev.clientX - drag.x); });
  const end = () => { if (!drag) return; drag = null; sp.classList.remove('dragging'); document.body.classList.remove('resizing'); save(); };
  sp.addEventListener('pointerup', end);
  sp.addEventListener('pointercancel', end);
  sp.addEventListener('dblclick', () => { apply(null); localStorage.removeItem(KEY); });
  sp.addEventListener('keydown', (ev) => {
    if (ev.key !== 'ArrowLeft' && ev.key !== 'ArrowRight') return;
    ev.preventDefault();
    apply(list.getBoundingClientRect().width + (ev.key === 'ArrowRight' ? STEP : -STEP));
    save();
  });
}
