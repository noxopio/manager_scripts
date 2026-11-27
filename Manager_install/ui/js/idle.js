// Aviso de inactividad: tras N minutos sin mover el ratón ni teclear (30 por defecto, configurable en la
// tarjeta de LAUNCH PAD → Inactividad) muestra "ERROR 404 · HUMAN NOT FOUND". Se cierra al hacer clic fuera
// de la tarjeta o con Esc. Sin sondeos: un único setTimeout que se reprograma.

const KEY = 'mfs.idleMinutes';
const DEFAULT_MINUTES = 30;

// ¿Ya pasó el tiempo de inactividad? minutes <= 0 = desactivado. Pura, para los tests.
export function isIdle(last, now, minutes) {
  return minutes > 0 && now - last >= minutes * 60000;
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

  const visible = () => !overlay.hidden;

  function show() {
    if (visible()) return;
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
