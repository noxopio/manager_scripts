// Estados vacíos del panel de repos: personaje y frase al azar (pulpo, gato, astronauta o terminal).
// Se elige al quedar vacío el panel y se mantiene mientras siga vacío (render() se llama en cada evento del stream).
// Dibujos propios en línea neón (currentColor); las animaciones están en components.css.
import { el } from './core.js';

const Z_GROUP = `<g class="sleepy-z" fill="currentColor" stroke="none" font-family="var(--font-display)" font-weight="800">
    <text class="z1" x="ZX1" y="ZY1" font-size="10">z</text>
    <text class="z2" x="ZX2" y="ZY2" font-size="13">z</text>
    <text class="z3" x="ZX3" y="ZY3" font-size="16">Z</text>
  </g>`;
const zAt = (x, y) => Z_GROUP.replace('ZX1', x).replace('ZY1', y).replace('ZX2', x + 7).replace('ZY2', y - 12).replace('ZX3', x + 15).replace('ZY3', y - 25);
const SVG_OPEN = (vb, cls) => `<svg class="${cls}" viewBox="${vb}" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">`;

const SVGS = {
  // Pulpo dormido: respira despacio y suben las "z z Z"
  pulpo: `${SVG_OPEN('0 0 110 92', 'sleepy art-octo')}
  <g class="sleepy-body">
    <path d="M20 58V44a30 30 0 0 1 60 0v14"/>
    <path d="M20 58q30 7 60 0"/>
    <path d="M20 58c0 9-4 14-9 16M36 61c0 9 3 13-1 18M52 62c0 9-3 13 1 18M68 61c0 9 3 13-1 18M80 58c0 9 4 14 9 16"/>
    <path d="M34 43q5 4 10 0M56 43q5 4 10 0"/>
    <path d="M46 52q4 3 8 0"/>
  </g>
  ${zAt(82, 34)}
</svg>`,
  // Gato hecho bolita sobre un teclado: la cola se balancea y suben las "z"
  gato: `${SVG_OPEN('0 0 130 96', 'sleepy art-cat')}
  <rect x="8" y="62" width="112" height="26" rx="5"/>
  <path d="M17 71h9M31 71h9M45 71h9M59 71h9M73 71h9M87 71h9M101 71h10M17 79h13M35 79h50M90 79h21" stroke-width="1.8"/>
  <g class="sleepy-body">
    <path d="M30 62c0-14 13-22 32-22s32 8 34 22"/>
    <path d="M30 58c-8 0-13-5-13-11s5-11 13-11 13 5 13 11"/>
    <path d="M20 40l1-9 6 5M34 36l6-6 1 9"/>
    <path d="M22 48q2.5 2 5 0M31 48q2.5 2 5 0"/>
    <path d="M27 53q1.5 1.2 3 0"/>
  </g>
  <path class="cat-tail" d="M96 60c9 0 14-5 13-13"/>
  ${zAt(44, 30)}
</svg>`,
  // Astronauta a la deriva: flota y gira despacio; dos estrellas parpadean
  astronauta: `${SVG_OPEN('0 0 120 104', 'sleepy art-astro')}
  <g class="astro-stars" stroke-width="1.8">
    <path class="s1" d="M16 14v12M10 20h12"/>
    <path class="s2" d="M102 78v10M97 83h10"/>
    <path class="s3" d="M98 16v6M95 19h6"/>
  </g>
  <g class="astro-body">
    <circle cx="58" cy="34" r="17"/>
    <path d="M47 31q11-8 22 0v3q-11 8-22 0z"/>
    <rect x="44" y="52" width="28" height="27" rx="9"/>
    <rect x="52" y="59" width="12" height="8" rx="2" stroke-width="1.8"/>
    <path d="M44 58l-11 9M72 58l11-7M51 79v13M65 79v11"/>
    <path d="M83 51c6-4 10-2 12 4" stroke-width="1.6" stroke-dasharray="2 3"/>
  </g>
</svg>`,
};

// Variantes y sus frases (una al azar debajo del mensaje del caso)
export const EMPTY_ARTS = [
  { id: 'pulpo', phrases: ['Shh… los repos duermen', 'Aquí solo hay tentáculos y silencio', 'Nada por aquí, nada por allá', 'Pulpo en modo ahorro de energía'] },
  { id: 'gato', phrases: ['El gato se quedó con el teclado', 'Prohibido molestar: siesta en curso', 'Miau… no hay repos que mostrar', 'Teclado ocupado por un felino'] },
  { id: 'astronauta', phrases: ['Perdido en el espacio… sin repos a la vista', 'Houston, no encontramos nada', 'Flotando entre listas vacías', 'Ni una señal en este cuadrante'] },
  { id: 'terminal', phrases: ['Ni el sistema sabe quién eres', 'Comando sin resultados', '404: repos not found', 'Prueba con otra lista o limpia el filtro'] },
];

// Índice de una variante distinta de la anterior. Pura, para los tests.
export function pickEmptyArt(prevId, rand = Math.random) {
  const ids = EMPTY_ARTS.map((a) => a.id);
  const pool = ids.length > 1 ? ids.filter((id) => id !== prevId) : ids;
  return pool[Math.min(pool.length - 1, Math.floor(rand() * pool.length))];
}
export function pickPhrase(id, rand = Math.random) {
  const art = EMPTY_ARTS.find((a) => a.id === id) || EMPTY_ARTS[0];
  return art.phrases[Math.min(art.phrases.length - 1, Math.floor(rand() * art.phrases.length))];
}

function buildArt(id) {
  if (id === 'terminal') {
    // Texto de terminal: "C:\>_ whoami ?" con cursor neón parpadeante
    return el('div', { class: 'art-term', 'aria-hidden': 'true' },
      el('span', { class: 'term-prompt' }, 'C:\\>'), el('span', { class: 'term-cursor' }, '_'), el('span', {}, ' whoami ?'));
  }
  const t = document.createElement('template');
  t.innerHTML = SVGS[id] || SVGS.pulpo;
  return t.content.firstElementChild;
}

// Se elige una variante por "episodio" de panel vacío; se mantiene mientras no cambie el caso
const current = { caseKey: null, id: null, phrase: '', lastId: null };
export function resetEmptyArt() { current.caseKey = null; current.id = null; }

// Para probar una variante concreta: localStorage['mfs.emptyArt'] = 'gato' | 'astronauta' | 'terminal' | 'pulpo'
function forcedArt() {
  try { const v = localStorage.getItem('mfs.emptyArt'); return EMPTY_ARTS.some((a) => a.id === v) ? v : null; } catch { return null; }
}

export function emptyArtState(caseKey, title, detail = '') {
  if (current.caseKey !== caseKey || !current.id) {
    current.caseKey = caseKey;
    current.id = forcedArt() || pickEmptyArt(current.lastId);
    current.lastId = current.id;
    current.phrase = pickPhrase(current.id);
  }
  return el('div', { class: `empty empty-state sleepy-state art-${current.id}`, 'data-art': current.id },
    buildArt(current.id),
    el('strong', {}, title),
    detail ? el('span', { class: 'empty-detail' }, detail) : null,
    el('span', { class: 'empty-phrase' }, current.phrase));
}
