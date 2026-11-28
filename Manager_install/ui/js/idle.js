// Aviso de inactividad: tras N minutos sin mover el ratón ni teclear (30 por defecto, configurable en la
// tarjeta de LAUNCH PAD → Inactividad) muestra una taza de café y uno de IDLE_MESSAGES. Se cierra al hacer clic fuera
// de la tarjeta o con Esc. Sin sondeos: un único setTimeout que se reprograma.

const KEY = 'mfs.idleMinutes';
const DEFAULT_MINUTES = 30;

// ¿Ya pasó el tiempo de inactividad? minutes <= 0 = desactivado. Pura, para los tests.
export function isIdle(last, now, minutes) {
  return minutes > 0 && now - last >= minutes * 60000;
}

// Mensajes del aviso: rotan en cada aparición (sin repetir el anterior). big = la palabra/número grande.
export const IDLE_MESSAGES = [
  { l1: 'ERROR', big: '404', l2: 'HUMAN NOT FOUND', l3: 'SORRY!' },
  { l1: 'SESIÓN EN PAUSA', big: 'AFK', l2: 'HUMANO FUERA DEL TECLADO', l3: 'vuelve cuando quieras' },
  { l1: 'fatal: timeout', big: '408', l2: 'HUMAN DID NOT RESPOND', l3: 'try: git pull coffee' },
  { l1: 'PROCESO EN SEGUNDO PLANO', big: 'Zzz', l2: 'CTRL+Z LA SIESTA', l3: 'sigue cuando quieras' },
];

// Índice de un mensaje distinto del anterior (si hay más de uno). Pura, para los tests.
export function pickIdleMessage(prevIndex = -1, rand = Math.random, count = IDLE_MESSAGES.length) {
  if (count <= 1) return 0;
  const valid = prevIndex >= 0 && prevIndex < count;
  const i = Math.min(count - (valid ? 2 : 1), Math.floor(rand() * (count - (valid ? 1 : 0))));
  return valid && i >= prevIndex ? i + 1 : i; // se salta el anterior
}

export function idleMinutes() {
  const raw = localStorage.getItem(KEY);
  const n = raw === null ? DEFAULT_MINUTES : Number(raw);
  return Number.isFinite(n) && n >= 0 ? n : DEFAULT_MINUTES; // acepta decimales (útil para probar)
}

// Lo que sigue usa el DOM: solo se ejecuta en el navegador (los tests importan solo isIdle)
if (typeof document !== 'undefined') {
  const overlay = document.querySelector('#idleOverlay');
  const card = document.querySelector('#idleCard');
  const select = document.querySelector('#idleMinutes');
  let lastActivity = Date.now();
  let timer = null;
  let returnFocus = null;
  let lastMessage = -1;

  const visible = () => !overlay.hidden;

  function fillMessage() {
    lastMessage = pickIdleMessage(lastMessage);
    const m = IDLE_MESSAGES[lastMessage];
    document.querySelector('#idleL1').textContent = m.l1;
    document.querySelector('#idleBig').textContent = m.big;
    document.querySelector('#idleL2').textContent = m.l2;
    document.querySelector('#idleL3').textContent = m.l3;
    card.setAttribute('aria-label', `Aviso de inactividad: ${m.l2}`);
  }

  function show() {
    if (visible()) return;
    fillMessage();
    returnFocus = document.activeElement;
    overlay.hidden = false;
    card.focus();
  }
  function hide() {
    overlay.hidden = true;
    lastActivity = Date.now();
    schedule();
    if (returnFocus && document.contains(returnFocus)) returnFocus.focus();
  }

  // Programa (o reprograma) la comprobación para cuando se cumpla el tiempo desde la última actividad
  function schedule() {
    clearTimeout(timer);
    const minutes = idleMinutes();
    if (minutes <= 0 || visible()) return;
    const wait = Math.max(0, lastActivity + minutes * 60000 - Date.now());
    timer = setTimeout(check, wait + 50);
  }
  function check() {
    if (isIdle(lastActivity, Date.now(), idleMinutes())) show();
    else schedule(); // hubo actividad: queda tiempo
  }

  // Actividad: solo actualiza la marca de tiempo (barato); mientras el aviso está visible no lo cierra
  const onActivity = () => { if (!visible()) lastActivity = Date.now(); };
  for (const ev of ['mousemove', 'mousedown', 'keydown', 'wheel', 'touchstart']) {
    document.addEventListener(ev, onActivity, { passive: true, capture: true });
  }
  // Al volver a la pestaña (los navegadores ralentizan los timers en segundo plano)
  const onReturn = () => { if (document.visibilityState === 'visible') check(); };
  document.addEventListener('visibilitychange', onReturn);
  window.addEventListener('focus', onReturn);

  // Cierre: clic fuera de la tarjeta o Esc; los clics dentro de la tarjeta no lo cierran
  overlay.addEventListener('click', (ev) => { if (ev.target === overlay) hide(); });
  document.addEventListener('keydown', (ev) => {
    if (ev.key === 'Escape' && visible()) { ev.preventDefault(); ev.stopPropagation(); hide(); }
  }, true);

  // Selector en la tarjeta de LAUNCH PAD
  select.value = String(idleMinutes());
  select.addEventListener('change', () => {
    localStorage.setItem(KEY, select.value);
    lastActivity = Date.now();
    schedule();
  });

  schedule();
}
