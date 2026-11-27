import { $ } from './core.js';

// Diálogo propio en lugar de confirm()/prompt() nativos.
// Confirmación: resuelve true/false. Con input: resuelve el texto, o null si se cancela.
export function ask({ title, message = '', okText = 'Aceptar', danger = false, input = false, value = '' }) {
  return new Promise((resolve) => {
    const d = $('#askDialog'), ok = $('#askOk'), inp = $('#askInput');
    $('#askTitle').textContent = title;
    $('#askMsg').textContent = message;
    $('#askMsg').style.display = message ? '' : 'none';
    inp.style.display = input ? '' : 'none';
    inp.value = value;
    ok.textContent = okText;
    ok.className = danger ? 'danger-solid' : 'primary';
    let done = false;
    const finish = (accepted) => {
      if (done) return;
      done = true;
      d.close();
      resolve(input ? (accepted ? inp.value.trim() : null) : accepted);
    };
    ok.onclick = () => finish(true);
    $('#askCancel').onclick = () => finish(false);
    d.oncancel = (ev) => { ev.preventDefault(); finish(false); }; // Esc
    inp.onkeydown = (ev) => { if (ev.key === 'Enter') { ev.preventDefault(); finish(true); } };
    d.showModal();
    if (input) { inp.focus(); inp.select(); } else ok.focus();
  });
}
