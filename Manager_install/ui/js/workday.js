// Jornada: la ilustración del pie del panel lateral pasa de neón a apagada a medida que avanza la jornada,
// y la línea de carga muestra el avance. Inicio y horas se configuran en la tarjeta de LAUNCH PAD (JORNADA).

const START_KEY = 'mfs.workStart';
const HOURS_KEY = 'mfs.workHours';
const DEFAULT_START = '09:00';
const DEFAULT_HOURS = 8;
const HOUR = 3600000;

const atTime = (base, hhmm, dayOffset = 0) => {
  const [h, m] = String(hhmm).split(':').map(Number);
  const d = new Date(base);
  d.setDate(d.getDate() + dayOffset);
  d.setHours(h || 0, m || 0, 0, 0);
  return d;
};

// Estado de la jornada en el instante `now`. Pura, para los tests.
// Turnos que cruzan la medianoche (22:00 + 8 h): antes del inicio de hoy se usa la ventana de ayer si sigue abierta.
export function workProgress(now, start = DEFAULT_START, hours = DEFAULT_HOURS) {
  if (!(hours > 0)) return { state: 'off', progress: 0, remainingMs: 0, startAt: null, endAt: null };
  let startAt = atTime(now, start);
  if (now < startAt) {
    const yesterday = atTime(now, start, -1);
    if (now < new Date(yesterday.getTime() + hours * HOUR)) startAt = yesterday;
  }
  const endAt = new Date(startAt.getTime() + hours * HOUR);
  if (now < startAt) return { state: 'before', progress: 0, remainingMs: endAt - startAt, startAt, endAt };
  if (now >= endAt) return { state: 'after', progress: 1, remainingMs: 0, startAt, endAt };
  const progress = (now - startAt) / (endAt - startAt);
  return { state: 'during', progress, remainingMs: endAt - now, startAt, endAt };
}

export function fmtRemaining(ms) {
  const total = Math.max(0, Math.round(ms / 60000));
  const h = Math.floor(total / 60), m = total % 60;
  return h ? `${h} h ${String(m).padStart(2, '0')} min` : `${m} min`;
}

// Lo que sigue usa el DOM: solo en el navegador (los tests importan las funciones puras)
if (typeof document !== 'undefined') {
  const box = document.querySelector('#workday');
  const bar = document.querySelector('#workdayBar');
  const text = document.querySelector('#workdayText');
  const startInput = document.querySelector('#workStart');
  const hoursSelect = document.querySelector('#workHours');
  const hhmm = (d) => d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  const settings = () => {
    const start = /^\d{2}:\d{2}$/.test(localStorage.getItem(START_KEY) || '') ? localStorage.getItem(START_KEY) : DEFAULT_START;
    const raw = localStorage.getItem(HOURS_KEY);
    const hours = raw === null ? DEFAULT_HOURS : Number(raw);
    return { start, hours: Number.isFinite(hours) && hours >= 0 ? hours : DEFAULT_HOURS };
  };

  function render() {
    const { start, hours } = settings();
    const w = workProgress(new Date(), start, hours);
    box.classList.remove('is-off', 'is-before', 'is-during', 'is-after');
    box.classList.add('is-' + w.state);
    // Durante la jornada el neón se va apagando; antes y después queda apagado (lo fija el CSS)
    if (w.state === 'during') box.style.setProperty('--on', (1 - w.progress).toFixed(3));
    else box.style.removeProperty('--on');
    box.style.setProperty('--progress', w.progress.toFixed(3));
    const pct = Math.round(w.progress * 100);
    bar.setAttribute('aria-valuenow', String(pct));
    if (w.state === 'off') { text.textContent = ''; box.title = 'Jornada desactivada (LAUNCH PAD → Jornada)'; return; }
    text.textContent = w.state === 'before' ? `Jornada desde las ${hhmm(w.startAt)}`
      : w.state === 'after' ? `Jornada terminada · ${hhmm(w.endAt)}`
      : `${pct}% · quedan ${fmtRemaining(w.remainingMs)}`;
    box.title = `Jornada ${hhmm(w.startAt)} – ${hhmm(w.endAt)} (${hours} h)`;
  }

  // Preferencias en la tarjeta de LAUNCH PAD
  const { start, hours } = settings();
  startInput.value = start;
  hoursSelect.value = String(hours);
  startInput.addEventListener('change', () => { if (startInput.value) localStorage.setItem(START_KEY, startInput.value); render(); });
  hoursSelect.addEventListener('change', () => { localStorage.setItem(HOURS_KEY, hoursSelect.value); render(); });

  render();
  setInterval(render, 60000);
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') render(); });
}
