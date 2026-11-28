// Código de barras Code 128 (conjunto B) sin librerías: la versión de mfs como código real.
// La franja LAUNCH PAD lo muestra en pequeño (decorativo pero auténtico) y la tarjeta de información
// en una tira escaneable. Sin DOM al cargarse, para los tests.

// Tabla estándar de patrones: anchos de barra/espacio alternos (cada símbolo suma 11 módulos; el Stop, 13)
export const CODE128 = [
  '212222', '222122', '222221', '121223', '121322', '131222', '122213', '122312', '132212', '221213',
  '221312', '231212', '112232', '122132', '122231', '113222', '123122', '123221', '223211', '221132',
  '221231', '213212', '223112', '312131', '311222', '321122', '321221', '312212', '322112', '322211',
  '212123', '212321', '232121', '111323', '131123', '131321', '112313', '132113', '132311', '211313',
  '231113', '231311', '112133', '112331', '132131', '113123', '113321', '133121', '313121', '211331',
  '231131', '213113', '213311', '213131', '311123', '311321', '331121', '312113', '312311', '332111',
  '314111', '221411', '431111', '111224', '111422', '121124', '121421', '141122', '141221', '112214',
  '112412', '122114', '122411', '142112', '142211', '241211', '221114', '413111', '241112', '134111',
  '111242', '121142', '121241', '114212', '124112', '124211', '411212', '421112', '421211', '212141',
  '214121', '412121', '111143', '111341', '131141', '114113', '114311', '411113', '411311', '113141',
  '114131', '311141', '411131', '211412', '211214', '211232', '2331112',
];
const START_B = 104;
const STOP = 106;

// Valores de los símbolos: Start B, los caracteres y la suma de comprobación. Pura, para los tests.
export function code128Values(text) {
  const values = [START_B];
  for (const ch of String(text)) {
    const code = ch.charCodeAt(0);
    if (ch.length !== 1 || code < 32 || code > 126) throw new Error(`Code 128 B no admite el carácter "${ch}"`);
    values.push(code - 32);
  }
  const checksum = values.reduce((sum, v, i) => sum + v * (i === 0 ? 1 : i), 0) % 103;
  return { values, checksum };
}

// Anchos de módulos alternando barra y espacio (empieza y acaba en barra). Pura.
export function code128B(text) {
  const { values, checksum } = code128Values(text);
  return [...values, checksum, STOP].flatMap((v) => CODE128[v].split('').map(Number));
}

// <svg> con las barras en currentColor. quiet = módulos en blanco a cada lado (10 para que se pueda escanear).
export function barcodeSvg(text, { quiet = 0, height = 40, className = '' } = {}) {
  const widths = code128B(text);
  const total = widths.reduce((a, b) => a + b, 0) + quiet * 2;
  const NS = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('viewBox', `0 0 ${total} ${height}`);
  svg.setAttribute('preserveAspectRatio', 'none');
  svg.setAttribute('shape-rendering', 'crispEdges');
  svg.setAttribute('aria-hidden', 'true');
  if (className) svg.setAttribute('class', className);
  let x = quiet;
  widths.forEach((w, i) => {
    if (i % 2 === 0) { // barra (los impares son espacios)
      const r = document.createElementNS(NS, 'rect');
      r.setAttribute('x', x); r.setAttribute('y', 0); r.setAttribute('width', w); r.setAttribute('height', height);
      r.setAttribute('fill', 'currentColor');
      svg.append(r);
    }
    x += w;
  });
  return svg;
}
