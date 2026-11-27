// Historial de cURL ⇄ .txt: formato de exportación, lectura al importar y ocultación de credenciales.
// Sin DOM: lo usan curl.js y los tests (node --test).

const isSeparator = (line) => /^#\s*─+\s*curl\s+\d+\s*─+\s*$/.test(line.trim());

// Texto del .txt exportado: cabecera comentada y cada comando tras "# ── curl N ──"
export function formatHistory(cmds, { version = '', date = '' } = {}) {
  const head = [
    `# Historial cURL · mfs${version ? ' ' + version : ''}${date ? ' · exportado ' + date : ''}`,
    '# Cada comando va después de una línea "# ── curl N ──". Se puede importar desde el panel (cURL → Importar).',
  ];
  const blocks = cmds.map((cmd, i) => `# ── curl ${i + 1} ──\n${cmd.replace(/\s+$/, '')}`);
  return head.join('\n') + '\n\n' + blocks.join('\n\n') + '\n';
}

// Comandos curl de un .txt: por separadores "# ── curl N ──" o, si no hay, por bloques separados por líneas en blanco
export function parseHistoryText(text) {
  const lines = String(text || '').replace(/^﻿/, '').split(/\r?\n/);
  const blocks = [];
  if (lines.some(isSeparator)) {
    let cur = null;
    for (const line of lines) {
      if (isSeparator(line)) { if (cur) blocks.push(cur); cur = []; } else if (cur) cur.push(line);
    }
    if (cur) blocks.push(cur);
  } else {
    let cur = [];
    for (const line of lines) {
      if (line.trim()) cur.push(line); else if (cur.length) { blocks.push(cur); cur = []; }
    }
    if (cur.length) blocks.push(cur);
  }
  const cmds = [];
  for (const block of blocks) {
    while (block.length && (!block[0].trim() || block[0].trim().startsWith('#'))) block.shift(); // comentarios iniciales
    while (block.length && !block[block.length - 1].trim()) block.pop();
    const cmd = block.join('\n').trim();
    if (/^curl(\.exe)?(\s|$)/i.test(cmd) && !cmds.includes(cmd)) cmds.push(cmd);
  }
  return cmds;
}

// Cambia por *** los valores de cabeceras y opciones con credenciales.
// Los tokens que vayan en la URL (query string) no se tocan.
const SECRET_HEADERS = 'proxy-authorization|authorization|cookie|x-api-key|api-key|x-auth-token|x-csrf-token|x-xsrf-token';
const HEADER_RE = new RegExp(`((?:^|[\\s'"^])(?:${SECRET_HEADERS})\\s*:\\s*)([^'"\\r\\n^]*)`, 'gi');
const OPTION_RE = /((?:^|\s)(?:-u|--user|-b|--cookie|--oauth2-bearer)(?:\s+|=))(\$?'(?:[^'\\]|\\.)*'|\^"[\s\S]*?\^"|"(?:[^"\\]|\\.)*"|\S+)/g;

export function redactCurl(cmd) {
  return String(cmd)
    .replace(HEADER_RE, (m, head, value) => (value.trim() ? head + '***' : m))
    .replace(OPTION_RE, (m, head, value) => {
      const q = value.startsWith("$'") ? "'" : value.startsWith('^"') ? '^"' : /^['"]/.test(value) ? value[0] : '';
      return head + q + '***' + q;
    });
}
