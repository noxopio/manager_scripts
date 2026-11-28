// Avisos al terminar: con la pestaña en segundo plano, notificación del sistema y contador en el título
// cuando un repo termina (ok), falla (error / compilación fallida) o queda listo (run).
// Se activa en la tarjeta de LAUNCH PAD → Avisos y se guarda en este navegador (mfs.notify).
import { $, toast, ACTION_LABEL } from './core.js';
import { setFaviconBadge } from './favicon.js';

const KEY = 'mfs.notify';

// Qué aviso corresponde a un cambio de estado (o null). Pura, para los tests.
// prev / next: { status, action, compile }
export function notifyKind(prev, next) {
  if (!prev || !next) return null;
  if (next.status === 'running' && next.action === 'run') {
    if (next.compile === 'ready' && prev.compile !== 'ready') return 'ready';
    if (next.compile === 'failed' && prev.compile !== 'failed') return 'failed';
    return null;
  }
  if (prev.status === 'running' && next.status === 'ok') return 'ok';
  if (prev.status === 'running' && next.status === 'error') return 'error';
  return null;
}

// La llama stream.js en cada cambio de estado de un repo (se rellena abajo, solo en el navegador)
export let notifyStatus = () => {};

if (typeof document !== 'undefined') {
  const toggle = $('#notifyToggle');
  const baseTitle = document.title;
  let unseen = 0;
  const enabled = () => localStorage.getItem(KEY) === '1' && 'Notification' in window && Notification.permission === 'granted';
  const away = () => document.visibilityState !== 'visible' || !document.hasFocus();

  toggle.checked = localStorage.getItem(KEY) === '1';
  toggle.addEventListener('change', async () => {
    if (!toggle.checked) { localStorage.setItem(KEY, '0'); return; }
    if (!('Notification' in window)) { toggle.checked = false; return toast('Este navegador no admite notificaciones'); }
    const perm = Notification.permission === 'default' ? await Notification.requestPermission() : Notification.permission;
    if (perm !== 'granted') {
      toggle.checked = false; localStorage.setItem(KEY, '0');
      return toast('El navegador bloqueó las notificaciones para este panel');
    }
    localStorage.setItem(KEY, '1');
    toast('Avisos activados');
  });

  const resetTitle = () => { unseen = 0; document.title = baseTitle; setFaviconBadge(false); };
  document.addEventListener('visibilitychange', () => { if (!away()) resetTitle(); });
  window.addEventListener('focus', resetTitle);

  const TEXT = {
    ready: (n) => [`${n} está listo`, 'El servidor ya responde; puedes abrirlo.'],
    failed: (n) => [`${n}: error de compilación`, 'Revisa el log en el panel.'],
    ok: (n, a) => [`${n}: ${ACTION_LABEL[a] || a} terminado`, 'Terminó sin errores.'],
    error: (n, a) => [`${n}: ${ACTION_LABEL[a] || a} con error`, 'Revisa el log en el panel.'],
  };

  notifyStatus = (repo, prev, next) => {
    const kind = notifyKind(prev, next);
    if (!kind || !enabled() || !away()) return;
    unseen += 1;
    document.title = `(${unseen}) ${baseTitle}`;
    setFaviconBadge(true); // punto rojo en el favicon hasta volver al panel
    const [title, body] = TEXT[kind](repo, next.action);
    const n = new Notification(title, { body, tag: `mfs-${repo}`, silent: kind === 'ok' || kind === 'ready' });
    // Al pulsar la notificación: volver al panel y abrir el log de ese repo
    n.onclick = () => { window.focus(); import('./repos.js').then((m) => m.selectRepo(repo)); n.close(); };
  };
}
