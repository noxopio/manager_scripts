// Tiempo real: eventos SSE del servidor, barra de resumen de lotes y recarga al volver a la pestaña.
import { $, el, state, ACTION_LABEL } from './core.js';
import { render, scheduleRefresh, runAction } from './repos.js';
import { appendLog } from './logview.js';
import { notifyStatus } from './notify.js';

export function connectStream() {
  const es = new EventSource('/api/stream');
  es.onmessage = (ev) => {
    const msg = JSON.parse(ev.data);
    const r = state.repos.find((x) => x.name === msg.repo);
    if (msg.type === 'log') {
      if (msg.repo === state.selected) appendLog(msg.line);
    } else if (msg.type === 'status' && r) {
      const prev = { status: r.status, action: r.action, compile: r.compile };
      r.status = msg.status; r.action = msg.action; r.port = msg.port; r.compile = msg.compile; r.healthState = msg.healthState;
      r.startedAt = msg.startedAt; r.endedAt = msg.endedAt;
      try { notifyStatus(r.name, prev, msg); } catch (e) { console.warn('Aviso no mostrado:', e.message); } // nunca impide repintar
      render();
      if (msg.status !== 'running' && msg.status !== 'stopping') scheduleRefresh();
    } else if (msg.type === 'batch') {
      showBatch(msg);
    }
  };
}

// Resumen de una acción lanzada sobre varios repos
let lastBatch = null;
function showBatch(b) {
  lastBatch = b;
  const label = ACTION_LABEL[b.action] || b.action;
  const text = $('#batchText'); text.textContent = '';
  text.append(el('strong', {}, `${label}: `), el('span', { class: 'ok' }, `${b.ok.length} ok`));
  if (b.error.length) text.append(' · ', el('span', { class: 'err' }, `${b.error.length} con error`), ` (${b.error.join(', ')})`);
  $('#batchBar').classList.toggle('has-errors', b.error.length > 0);
  $('#batchRetry').hidden = !b.error.length;
  $('#batchBar').hidden = false;
}
$('#batchRetry').onclick = () => {
  if (!lastBatch) return;
  $('#batchBar').hidden = true;
  runAction(lastBatch.action, lastBatch.error, lastBatch.extra || {});
};
$('#batchClose').onclick = () => { $('#batchBar').hidden = true; };

// Al volver a la pestaña se recarga el estado git (como mucho cada 10 s)
let lastFocusRefresh = 0;
function refreshOnReturn() {
  if (document.visibilityState !== 'visible' || Date.now() - lastFocusRefresh < 10000) return;
  lastFocusRefresh = Date.now();
  scheduleRefresh();
}
document.addEventListener('visibilitychange', refreshOnReturn);
window.addEventListener('focus', refreshOnReturn);
