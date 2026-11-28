// Favicon: el logo de mfs (hexágono + >_) sin fondo y con todas sus líneas en el color de acento elegido,
// y un punto rojo en la esquina cuando hay avisos sin ver. Se genera al vuelo como data: URL
// (index.html solo trae un <link rel="icon" href="data:,"> vacío para que el navegador no pida /favicon.ico).

const LOGO_GREEN = '#78DC9B';

// SVG del favicon: sin fondo y con todas las líneas (hexágono y >_) en el color del tema. Pura, para los tests.
export function faviconSvg(color, badge = false) {
  const stroke = String(color || '').trim() || LOGO_GREEN;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">`
    + `<g fill="none" stroke="${stroke}" stroke-width="5" stroke-linecap="round" stroke-linejoin="round">`
    + `<path d="M32 6 L55 19 V45 L32 58 L9 45 V19 Z"/>`
    + `<path d="M20 25 L29 33 L20 41 M35 42 H45"/>`
    + `</g>`
    + (badge ? `<circle cx="52" cy="12" r="10" fill="#ff4d4f"/>` : '')
    + `</svg>`;
}

let badgeOn = false;

export function refreshFavicon() {
  if (typeof document === 'undefined') return;
  let link = document.querySelector('link[rel="icon"]');
  if (!link) { link = document.createElement('link'); link.rel = 'icon'; document.head.append(link); }
  const accent = getComputedStyle(document.documentElement).getPropertyValue('--accent');
  link.type = 'image/svg+xml';
  link.href = 'data:image/svg+xml,' + encodeURIComponent(faviconSvg(accent, badgeOn));
}

// Punto de aviso (lo activa notify.js con avisos sin ver y lo quita al volver al panel)
export function setFaviconBadge(on) {
  if (badgeOn === !!on) return;
  badgeOn = !!on;
  refreshFavicon();
}

if (typeof document !== 'undefined') {
  refreshFavicon();
  // El acento cambia con el tema del sistema (p. ej. blanco → grafito en claro)
  window.matchMedia('(prefers-color-scheme: light)').addEventListener('change', refreshFavicon);
}
