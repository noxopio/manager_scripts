// Panel de log: pinta una línea por <span> (coloreando ERROR/WARN), búsqueda con resaltado
// (CSS Custom Highlight API, sin tocar el DOM del log) y descarga del log como .txt.
import { $, el, state, toast } from './core.js';

const MAX_LINES = 5000; // líneas en pantalla en vivo; las más antiguas se descartan
const ERR_RE = /\[ERROR\]|\bERROR\b|ERR!|Exception|\bFAILED\b|^fatal:|Failed to compile|compiled with \d+ errors?/i;
const WARN_RE = /\[WARN(?:ING)?\]|\bWARN(?:ING)?\b|compiled with \d+ warnings?/i;

// Clase de color de una línea ('err' | 'warn' | ''). Pura, para los tests.
export function lineClass(line) {
  if (ERR_RE.test(line)) return 'err';
  if (WARN_RE.test(line)) return 'warn';
  return '';
}

const logEl = () => $('#log');
function lineNode(text) {
  const cls = lineClass(text);
  return el('span', { class: cls ? `ln ${cls}` : 'ln' }, text + '\n');
}
function follow() { if ($('#follow').checked) logEl().scrollTop = logEl().scrollHeight; }

// Reemplaza todo el log (al seleccionar un repo). head = línea informativa opcional
export function setLog(lines, head = '') {
  const frag = document.createDocumentFragment();
  if (head) frag.append(el('span', { class: 'ln note' }, head + '\n'));
  for (const l of lines.slice(-MAX_LINES)) frag.append(lineNode(l));
  logEl().replaceChildren(frag);
  follow();
  search.refresh(true);
}
export function appendLog(line) {
  const log = logEl();
  log.append(lineNode(line));
  while (log.childElementCount > MAX_LINES) log.firstElementChild.remove();
  follow();
  search.refresh(false);
}
export function clearLog() { logEl().replaceChildren(); search.refresh(true); }

// ── Búsqueda ──
const supportsHighlight = typeof CSS !== 'undefined' && 'highlights' in CSS && typeof Highlight !== 'undefined';
const search = {
  ranges: [],
  index: -1,
  timer: null,
  query() { return $('#logSearch').value; },
  // Recalcula coincidencias; reset = volver a la primera (si no, conserva la posición)
  refresh(reset) {
    clearTimeout(this.timer);
    this.timer = setTimeout(() => this.compute(reset), reset ? 0 : 250);
  },
  compute(reset) {
    const q = this.query().toLowerCase();
    const prevIndex = this.index;
    this.ranges = [];
    if (q) {
      const walker = document.createTreeWalker(logEl(), NodeFilter.SHOW_TEXT);
      for (let n = walker.nextNode(); n; n = walker.nextNode()) {
        const text = n.data.toLowerCase();
        for (let i = text.indexOf(q); i !== -1; i = text.indexOf(q, i + q.length)) {
          const r = new Range(); r.setStart(n, i); r.setEnd(n, i + q.length); this.ranges.push(r);
        }
      }
    }
    this.index = !this.ranges.length ? -1 : reset || prevIndex < 0 ? 0 : Math.min(prevIndex, this.ranges.length - 1);
    this.paint(reset);
  },
  paint(scroll) {
    const n = this.ranges.length;
    $('#logCount').textContent = this.query() ? (n ? `${this.index + 1}/${n}` : '0/0') : '';
    $('#logSearch').classList.toggle('no-match', !!this.query() && !n);
    $('#logPrev').disabled = $('#logNext').disabled = n < 2;
    if (supportsHighlight) {
      CSS.highlights.set('log-search', new Highlight(...this.ranges));
      CSS.highlights.set('log-search-current', n ? new Highlight(this.ranges[this.index]) : new Highlight());
    }
    if (scroll && n) this.scrollTo(this.ranges[this.index]);
  },
  scrollTo(range) {
    // Centra la coincidencia dentro del log sin mover la página
    const log = logEl();
    const r = range.getBoundingClientRect(), box = log.getBoundingClientRect();
    log.scrollTop += r.top - box.top - log.clientHeight / 2;
  },
  step(dir) {
    if (!this.ranges.length) return;
    this.index = (this.index + dir + this.ranges.length) % this.ranges.length;
    this.paint(true);
  },
};

// Eventos del DOM: solo en el navegador (los tests importan lineClass)
if (typeof document !== 'undefined') {
  $('#logSearch').addEventListener('input', () => search.refresh(true));
  $('#logSearch').addEventListener('keydown', (ev) => {
    if (ev.key === 'Enter') { ev.preventDefault(); search.step(ev.shiftKey ? -1 : 1); }
    else if (ev.key === 'Escape') { ev.stopPropagation(); $('#logSearch').value = ''; search.refresh(true); }
  });
  $('#logPrev').onclick = () => search.step(-1);
  $('#logNext').onclick = () => search.step(1);
  // Ctrl+F con el foco dentro del panel de log: busca en el log en vez de en la página
  document.querySelector('.logpane').addEventListener('keydown', (ev) => {
    if ((ev.ctrlKey || ev.metaKey) && ev.key.toLowerCase() === 'f') { ev.preventDefault(); $('#logSearch').focus(); $('#logSearch').select(); }
  });

  // ── Descarga ──
  const pad = (n) => String(n).padStart(2, '0');
  $('#logDownload').onclick = () => {
    const text = logEl().textContent;
    if (!text.trim()) return toast('El log está vacío');
    const d = new Date();
    const name = `${state.selected || 'log'}-${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}.log.txt`;
    const url = URL.createObjectURL(new Blob([text], { type: 'text/plain;charset=utf-8' }));
    const a = el('a', { href: url, download: name });
    document.body.append(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
}
