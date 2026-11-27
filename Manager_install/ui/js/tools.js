// Menú Herramientas: procesos Node (mfs ps / kill), ayuda (mfs help) y Base64.
import { $, el, api, toast } from './core.js';
import { ask } from './dialogs.js';

// Menú Herramientas: se cierra al elegir una opción, al pulsar fuera o con Esc
const toolsMenu = $('#toolsMenu');
toolsMenu.querySelector('.menu-list').addEventListener('click', () => { toolsMenu.open = false; });
document.addEventListener('click', (ev) => { if (toolsMenu.open && !toolsMenu.contains(ev.target)) toolsMenu.open = false; });
document.addEventListener('keydown', (ev) => { if (ev.key === 'Escape' && toolsMenu.open) { toolsMenu.open = false; toolsMenu.querySelector('summary').focus(); } });

// Equivalente a "mfs ps" / "mfs kill"
async function loadPs() {
  try {
    const { processes } = await api('/api/ps');
    const list = $('#psList'); list.textContent = '';
    if (!processes.length) { list.textContent = 'No hay procesos de Node en ejecución.'; return; }
    for (const p of processes) {
      const protectedProc = p.self || !!p.panel;
      const tag = p.self ? '← este panel'
        : p.panel ? `← panel mfs :${p.panel.port} (${p.panel.workDir})`
        : (p.command || '');
      const box = el('input', { type: 'checkbox', value: String(p.pid), ...(protectedProc ? { disabled: '' } : {}) });
      list.append(el('label', { class: 'ps-row' }, box, el('span', {}, `PID ${String(p.pid).padEnd(8)} ${String(p.memory || '').padEnd(12)} ${tag}`)));
    }
  } catch (e) { $('#psList').textContent = e.message; }
}
const psBoxes = () => [...$('#psList').querySelectorAll('input[type=checkbox]:not(:disabled)')];
$('#psBtn').onclick = () => { $('#psDialog').showModal(); loadPs(); };
$('#psRefresh').onclick = loadPs;
$('#psClose').onclick = () => $('#psDialog').close();
$('#psSelectAll').onclick = () => {
  const boxes = psBoxes(); const all = boxes.every((b) => b.checked);
  boxes.forEach((b) => { b.checked = !all; });
};
$('#killNode').onclick = async () => {
  const pids = psBoxes().filter((b) => b.checked).map((b) => Number(b.value));
  if (!pids.length) return toast('Marca al menos un proceso');
  const ok = await ask({
    title: 'Matar procesos Node',
    message: `Se terminarán ${pids.length} proceso(s) de Node:\n\n${pids.map((p) => '  PID ' + p).join('\n')}\n\nPueden incluir procesos iniciados fuera del panel.`,
    okText: 'Matar seleccionados',
    danger: true,
  });
  if (!ok) return;
  try {
    const r = await api('/api/kill-node', { method: 'POST', body: JSON.stringify({ pids }) });
    toast(`${r.killed} proceso(s) de Node terminados`); setTimeout(loadPs, 800);
  } catch (e) { toast(e.message); }
};

// Equivalente a "mfs help"
$('#helpBtn').onclick = async () => {
  $('#helpDialog').showModal();
  try { $('#helpText').textContent = (await api('/api/readme')).content; } catch (e) { $('#helpText').textContent = e.message; }
};
$('#helpClose').onclick = () => $('#helpDialog').close();

// Codificador Base64 UTF-8, sin ejecutar comandos de shell ni enviar los datos al servidor.
let codecOutputAvailable = false;
function encodeBase64Utf8(value) {
  const bytes = new TextEncoder().encode(value);
  let binary = '';
  for (let i = 0; i < bytes.length; i += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  }
  return btoa(binary);
}
function decodeBase64Utf8(value) {
  const compact = value.replace(/\s/g, '');
  if (!compact) return '';
  if (!/^[A-Za-z0-9+/]*={0,2}$/.test(compact)) throw new Error('La entrada no tiene el formato Base64 estándar.');
  const firstPadding = compact.indexOf('=');
  const dataLength = firstPadding < 0 ? compact.length : firstPadding;
  const padding = compact.length - dataLength;
  if (dataLength % 4 === 1 || (padding && (compact.length % 4 !== 0 || (padding === 1 && dataLength % 4 !== 3) || (padding === 2 && dataLength % 4 !== 2)))) {
    throw new Error('La longitud o el relleno de la cadena Base64 no son válidos.');
  }
  const padded = compact + '='.repeat((4 - compact.length % 4) % 4);
  let binary;
  try { binary = atob(padded); }
  catch { throw new Error('No se pudo decodificar la cadena Base64.'); }
  const bytes = Uint8Array.from(binary, (ch) => ch.charCodeAt(0));
  try { return new TextDecoder('utf-8', { fatal: true }).decode(bytes); }
  catch { throw new Error('El contenido decodificado no es texto UTF-8 válido.'); }
}
function codecStatus(message, error = false) {
  const status = $('#codecStatus');
  status.textContent = message;
  status.classList.toggle('error', error);
}
function transformCodec(mode) {
  try {
    const input = $('#codecInput').value;
    let result;
    if (mode === 'encode') {
      result = encodeBase64Utf8(input);
      codecStatus('Texto codificado en Base64.');
    } else {
      const decoded = decodeBase64Utf8(input);
      if (mode === 'decodeJson') {
        try { result = JSON.stringify(JSON.parse(decoded), null, 2); }
        catch (e) { throw new Error(`El contenido decodificado no es JSON válido: ${e.message}`); }
        codecStatus('JSON decodificado y formateado.');
      } else {
        result = decoded;
        codecStatus('Texto decodificado.');
      }
    }
    $('#codecOutput').value = result;
    codecOutputAvailable = true;
    $('#codecCopy').disabled = $('#codecSwap').disabled = false;
  } catch (e) {
    $('#codecOutput').value = '';
    codecOutputAvailable = false;
    $('#codecCopy').disabled = $('#codecSwap').disabled = true;
    codecStatus(e.message, true);
  }
}
document.querySelectorAll('[data-codec-action]').forEach((button) => {
  button.addEventListener('click', () => transformCodec(button.dataset.codecAction));
});
$('#codecBtn').onclick = () => { $('#codecDialog').showModal(); $('#codecInput').focus(); };
$('#codecClose').onclick = () => $('#codecDialog').close();
$('#codecInput').oninput = () => {
  $('#codecOutput').value = '';
  codecOutputAvailable = false;
  $('#codecCopy').disabled = $('#codecSwap').disabled = true;
  codecStatus('');
};
$('#codecClear').onclick = () => {
  $('#codecInput').value = $('#codecOutput').value = '';
  codecOutputAvailable = false;
  $('#codecCopy').disabled = $('#codecSwap').disabled = true;
  codecStatus('');
  $('#codecInput').focus();
};
$('#codecSwap').onclick = () => {
  if (!codecOutputAvailable) return;
  $('#codecInput').value = $('#codecOutput').value;
  $('#codecOutput').value = '';
  codecOutputAvailable = false;
  $('#codecCopy').disabled = $('#codecSwap').disabled = true;
  codecStatus('Resultado pasado a la entrada.');
  $('#codecInput').focus();
};
$('#codecCopy').onclick = async () => {
  if (!codecOutputAvailable) return;
  try {
    await navigator.clipboard.writeText($('#codecOutput').value);
    codecStatus('Resultado copiado.');
  } catch {
    const output = $('#codecOutput'); output.focus(); output.select();
    const copied = document.execCommand('copy');
    codecStatus(copied ? 'Resultado copiado.' : 'No se pudo copiar; selecciona y copia el resultado manualmente.', !copied);
  }
};
