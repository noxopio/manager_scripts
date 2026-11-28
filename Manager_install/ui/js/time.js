// Formato de duraciones para las tarjetas ("8 s", "3 min", "1 h 12 min"). Sin DOM, para los tests.
export function fmtElapsed(ms) {
  const s = Math.max(0, Math.floor(ms / 1000));
  if (s < 60) return `${s} s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  return m % 60 ? `${h} h ${m % 60} min` : `${h} h`;
}

const ACTION_DONE = { ok: 'ok', error: 'con error', stopped: 'detenido' };

// Texto de tiempo de una tarjeta según su último trabajo, o '' si no hay datos.
// now se pasa para poder probarlo. Pura.
export function elapsedText(r, now = Date.now()) {
  if (!r.startedAt) return '';
  const start = Date.parse(r.startedAt);
  if (r.status === 'running' || r.status === 'stopping') {
    return r.action === 'run' ? `⏱ arriba ${fmtElapsed(now - start)}` : `⏱ ${fmtElapsed(now - start)}`;
  }
  if (!r.endedAt || !ACTION_DONE[r.status]) return '';
  const end = Date.parse(r.endedAt);
  return `${r.action} ${ACTION_DONE[r.status]} en ${fmtElapsed(end - start)} · hace ${fmtElapsed(now - end)}`;
}
