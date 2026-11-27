// Frases del tooltip del 👾: reaccionan al estado del panel (repos en ejecución, cambios, errores…).
// Sin DOM: lo usan main.js (en cada hover) y los tests.

const s = (n, one, many) => (n === 1 ? one : many);

// Frases al azar (las de siempre + algunas nuevas). Se usan cuando no aplica ninguna categoría
// y, a veces, aunque aplique alguna (para que no se repita siempre lo mismo).
export const RANDOM_QUIPS = [
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
  'Pull antes de quejarte',
  'git blame: el detector oficial de culpables',
  'Si compila a la primera, revisa que guardaste',
  'Rebase con cariño, nunca con --force',
  'localhost es mi segunda casa',
  'Este panel tiene más ramas que un árbol',
  'Los microfrontends también necesitan amor',
];

// Categorías por prioridad: se usa la primera que aplica. Cada frase recibe el número de repos afectados.
const CATEGORIES = [
  {
    when: (c) => c.total === 0,
    quips: [
      () => 'Lista vacía: el silencio antes del primer pull',
      () => 'Sin repos a la vista. ¿Editar lista?',
      () => 'Un panel sin repos es solo un fondo bonito',
    ],
  },
  {
    when: (c) => c.locked > 0, count: (c) => c.locked,
    quips: [
      (n) => `${n} ${s(n, 'repo', 'repos')} con index.lock. Git está en huelga`,
      () => 'Hay un candado en .git. Desbloquear antes de seguir',
      () => 'index.lock abandonado: alguien cortó un git a mitad',
    ],
  },
  {
    when: (c) => c.errors > 0, count: (c) => c.errors,
    quips: [
      (n) => (n === 1 ? 'Un repo en rojo. No es el tema, es el build' : `${n} repos en rojo. No es el tema, es el build`),
      (n) => `${n} ${s(n, 'error', 'errores')}. Respira, lee el log, vuelve a intentar`,
      () => 'El log tiene algo que contarte',
      () => 'Rojo de error, no rojo de tema. Revisa el log',
    ],
  },
  {
    when: (c) => c.running > 0, count: (c) => c.running,
    quips: [
      (n) => `${n} ${s(n, 'frontend despegado', 'frontends despegados')}. Torre de control atenta 🛰️`,
      (n) => `${n} ${s(n, 'proceso corriendo', 'procesos corriendo')}: el ventilador lo sabe`,
      (n) => `${n} en vuelo. Detener todo está a un clic`,
      () => 'Compilando… buen momento para un café',
    ],
  },
  {
    when: (c) => c.changes > 0, count: (c) => c.changes,
    quips: [
      (n) => `${n} ${s(n, 'repo', 'repos')} con cambios sin commit. El git status te mira fijo`,
      () => 'Commit temprano, commit a menudo, push con fe',
      (n) => `${n} ${s(n, 'repo pide', 'repos piden')} un commit con buen mensaje`,
      () => 'Cambios sin guardar en git: vivir al límite',
    ],
  },
  {
    when: (c) => c.uncloned > 0, count: (c) => c.uncloned,
    quips: [
      (n) => `${n} ${s(n, 'repo esperando', 'repos esperando')} su primer pull`,
      () => 'Hay repos en la lista que aún no existen en disco',
      () => 'Pull y que empiece la fiesta',
    ],
  },
  {
    when: (c) => c.total > 0,
    quips: [
      () => 'Todo en orden. Sospechoso.',
      () => 'Working tree clean. Disfruta el momento',
      () => 'Sin cambios, sin errores, sin excusas',
      () => 'Todo limpio: buen momento para un pull',
    ],
  },
];

const RANDOM_CHANCE = 0.25; // probabilidad de una frase al azar aunque aplique una categoría
const pick = (list, rand) => list[Math.min(list.length - 1, Math.floor(rand() * list.length))];

export function summarize(repos = []) {
  return {
    total: repos.length,
    running: repos.filter((r) => r.status === 'running' || r.status === 'stopping').length,
    errors: repos.filter((r) => r.status === 'error').length,
    changes: repos.filter((r) => r.cloned && r.changes).length,
    locked: repos.filter((r) => r.locked).length,
    uncloned: repos.filter((r) => !r.cloned).length,
  };
}

// Frase para el estado actual. rand se puede fijar en los tests.
export function pickQuip(repos = [], rand = Math.random) {
  if (rand() < RANDOM_CHANCE) return pick(RANDOM_QUIPS, rand);
  const c = summarize(repos);
  const cat = CATEGORIES.find((k) => k.when(c));
  if (!cat) return pick(RANDOM_QUIPS, rand);
  return pick(cat.quips, rand)(cat.count ? cat.count(c) : c.total);
}
