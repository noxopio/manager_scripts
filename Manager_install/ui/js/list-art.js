// Ilustración del final de la lista de repos, abajo a la derecha: una de tres variantes (audífonos de diadema,
// auriculares colgando de sus cables o medio cerebro con un chip), grabada en el fondo y en neón con el acento al pasar el ratón.
// Se elige una por carga de la página, sin repetir la anterior. Se activa o desactiva en la tarjeta de
// LAUNCH PAD (DECORACIÓN) y la elección se guarda en este navegador.
// Para probar una variante concreta: localStorage['mfs.listArtForce'] = 'audifonos' | 'auriculares' | 'cerebro'
import { el } from './core.js';

const KEY = 'mfs.listArt';
const LAST_KEY = 'mfs.listArtLast';
const FORCE_KEY = 'mfs.listArtForce';

// Todo en currentColor (sigue el grabado y el neón del tema); los huecos son máscaras, no colores fijos
const SVGS = {
  audifonos: `<svg class="list-art" viewBox="0 0 120 210" aria-hidden="true" fill="currentColor" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round">
  <path d="M21 72 V58 A39 39 0 0 1 99 58 V72" fill="none" stroke-width="7"/>
  <rect x="12" y="58" width="17" height="36" rx="8" stroke="none"/>
  <rect x="27" y="62" width="7" height="28" rx="3.5" fill="none" stroke-width="2"/>
  <rect x="91" y="58" width="17" height="36" rx="8" stroke="none"/>
  <rect x="86" y="62" width="7" height="28" rx="3.5" fill="none" stroke-width="2"/>
  <path d="M20 94 C20 112 28 122 44 124" fill="none" stroke-width="1.5"/>
  <path d="M52 78 L68 78 L60 68 Z" stroke="none"/><rect x="52" y="81" width="16" height="3" stroke="none"/>
  <rect x="53" y="91" width="14" height="14" stroke="none"/>
  <rect x="52" y="113" width="16" height="4" stroke="none"/><rect x="52" y="120" width="16" height="4" stroke="none"/>
  <path d="M52 142 L68 142 L60 132 Z" stroke="none"/>
  <path d="M52 149 L68 149 L60 158 Z" stroke="none"/><path d="M52 157 L68 157 L60 166 Z" stroke="none"/>
  <path d="M60 168 C62 182 80 182 78 194 C76 204 56 204 40 199" fill="none" stroke-width="1.5"/>
  <path d="M40 199 L29 196" fill="none" stroke-width="3.5"/>
  <path d="M29 196 L22 194" fill="none" stroke-width="1.5"/>
</svg>`,
  // Auriculares in-ear colgando de sus cables (diseño propuesto por el usuario, pasado a currentColor)
  auriculares: `<svg class="list-art" viewBox="14 0 56 160" aria-hidden="true" fill="none" stroke-linecap="round" stroke-linejoin="round">
  <defs><mask id="listArtBudSlots" maskUnits="userSpaceOnUse" x="0" y="0" width="120" height="210">
    <rect x="0" y="0" width="120" height="210" fill="#fff"/>
    <rect x="24" y="145" width="5" height="1.6" rx="0.8" fill="#000"/>
    <rect x="54" y="121" width="5" height="1.6" rx="0.8" fill="#000"/>
  </mask></defs>
  <g stroke="currentColor" stroke-width="1.5"><path d="M28 0 V118"/><path d="M54 0 V94"/></g>
  <g fill="currentColor" opacity=".55"><rect x="26.8" y="118" width="2.4" height="7" rx="1"/><rect x="52.8" y="94" width="2.4" height="7" rx="1"/></g>
  <g fill="currentColor" mask="url(#listArtBudSlots)">
    <rect x="26.4" y="124" width="3.2" height="14" rx="1.5"/>
    <path d="M28 137 C23 137 20 141 20 146 C20 152 24 156 29 156 C35 156 39 152 39 146 C39 141 34 137 28 137 Z"/>
    <rect x="52.4" y="100" width="3.2" height="14" rx="1.5"/>
    <path d="M54 113 C49 113 46 117 46 122 C46 128 50 132 55 132 C61 132 65 128 65 122 C65 117 60 113 54 113 Z"/>
  </g>
  <g stroke="currentColor" stroke-width="1.5">
    <path d="M37 141 C39 142 40 144 40 147 V151"/>
    <path d="M47 116 C45 117 44 119 44 122 V126"/>
  </g>
</svg>`,
  // Medio cerebro + chip: lóbulos con surcos (huecos de la máscara) y pistas de circuito que acaban en nodos
  cerebro: `<svg class="list-art" viewBox="0 0 128 140" aria-hidden="true" fill="currentColor" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round">
  <defs><mask id="listArtBrainFolds" maskUnits="userSpaceOnUse" x="0" y="0" width="128" height="140">
    <rect x="0" y="0" width="128" height="140" fill="#fff"/>
    <g fill="none" stroke="#000" stroke-width="3">
      <path d="M30 34 C36 29 44 31 48 37"/><path d="M20 56 C28 51 35 55 37 62"/>
      <path d="M50 48 C45 54 46 61 53 64"/><path d="M18 80 C26 75 34 79 36 86"/>
      <path d="M46 76 C49 83 55 84 60 81"/><path d="M26 101 C33 96 41 99 43 106"/>
      <path d="M52 94 C49 100 52 107 58 108"/><path d="M38 121 C43 116 50 116 54 121"/>
    </g>
  </mask></defs>
  <g stroke="none" mask="url(#listArtBrainFolds)">
    <circle cx="44" cy="25" r="16"/><circle cx="29" cy="42" r="16"/><circle cx="23" cy="64" r="16"/>
    <circle cx="25" cy="87" r="16"/><circle cx="33" cy="107" r="16"/><circle cx="47" cy="120" r="13"/>
    <rect x="40" y="9" width="22" height="124" rx="9"/>
  </g>
  <rect x="67" y="44" width="24" height="52" rx="3" fill="none" stroke-width="3"/>
  <rect x="72" y="50" width="14" height="40" rx="1.5" stroke="none"/>
  <g fill="none" stroke-width="2.5">
    <path d="M70 44 V24"/><path d="M85 44 V36 L101 19"/><path d="M91 55 H105 L113 47"/>
    <path d="M91 66 H110"/><path d="M91 78 H103 L112 87"/><path d="M85 96 V104 L101 120"/><path d="M70 96 V115"/>
  </g>
  <g stroke="none">
    <circle cx="70" cy="21" r="4"/><circle cx="104" cy="16" r="6"/><circle cx="116" cy="44" r="6"/>
    <circle cx="113" cy="66" r="4"/><circle cx="115" cy="90" r="6"/><circle cx="104" cy="123" r="6"/><circle cx="70" cy="119" r="4"/>
  </g>
</svg>`,
};
export const LIST_ARTS = Object.keys(SVGS);

// Variante para esta carga de la página: la forzada, o una al azar distinta de la anterior. Pura, para los tests.
export function pickListArt(last, rnd = Math.random) {
  const pool = LIST_ARTS.filter((id) => id !== last);
  return pool[Math.floor(rnd() * pool.length) % pool.length];
}

let current = null;
function currentArt() {
  if (current) return current;
  let forced = null, last = null;
  try { forced = localStorage.getItem(FORCE_KEY); last = localStorage.getItem(LAST_KEY); } catch { /* sin almacenamiento */ }
  current = LIST_ARTS.includes(forced) ? forced : pickListArt(last);
  try { localStorage.setItem(LAST_KEY, current); } catch { /* sin almacenamiento */ }
  return current;
}

export const listArtEnabled = () => localStorage.getItem(KEY) !== '0';

// Se añade al final de #repos; margin-top:auto la lleva al espacio libre de abajo
export function listArtNode() {
  const id = currentArt();
  const t = document.createElement('template');
  t.innerHTML = SVGS[id];
  return el('div', { class: `list-tail art-${id}`, 'data-art': id }, t.content.firstElementChild);
}

if (typeof document !== 'undefined') {
  const toggle = document.querySelector('#listArtToggle');
  const apply = () => document.body.classList.toggle('no-list-art', !listArtEnabled());
  toggle.checked = listArtEnabled();
  toggle.addEventListener('change', () => { localStorage.setItem(KEY, toggle.checked ? '1' : '0'); apply(); });
  apply();
}
