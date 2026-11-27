import { el } from './core.js';

export const ICONS = {
  folder: { paths: ['M3.5 7A1.5 1.5 0 0 1 5 5.5h4l2 2h8A1.5 1.5 0 0 1 20.5 9v8A1.5 1.5 0 0 1 19 18.5H5A1.5 1.5 0 0 1 3.5 17z'] },
  refresh: { paths: ['M20 7v5h-5', 'M19 12a7 7 0 0 0-12.1-4.9L5 9', 'M4 17v-5h5', 'M5 12a7 7 0 0 0 12.1 4.9L19 15'] },
  branch: { paths: ['M7 4v10a4 4 0 0 0 4 4h2a4 4 0 0 0 4-4V9', 'M7 9a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z', 'M17 9a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z', 'M13 20a2 2 0 1 0 0-4 2 2 0 0 0 0 4z'] },
  lock: { paths: ['M5 10h14v10H5z', 'M8 10V7a4 4 0 1 1 8 0v3'], circles: [[12, 15, 1]] },
  repo: { paths: ['M5 4.5h14A1.5 1.5 0 0 1 20.5 6v12a1.5 1.5 0 0 1-1.5 1.5H5A1.5 1.5 0 0 1 3.5 18V6A1.5 1.5 0 0 1 5 4.5z', 'M8 4.5v15', 'M11 8h6', 'M11 12h6'] },
  menu: { paths: ['M4 7h16', 'M4 12h16', 'M4 17h16'] },
  collapse: { paths: ['m7 4 5 5 5-5', 'm7 20 5-5 5 5'] },
  expand: { paths: ['m7 9 5-5 5 5', 'm7 15 5 5 5-5'] },
  play: { paths: ['M8 5.5v13l10.5-6.5z'] },
  stop: { paths: ['M7 7h10v10H7z'] },
  search: { paths: ['M10.8 18.3a7.5 7.5 0 1 0 0-15 7.5 7.5 0 0 0 0 15z', 'm16.2 16.2 4.3 4.3'] },
  file: { paths: ['M6 3.5h8l4 4V20a.5.5 0 0 1-.5.5h-11A.5.5 0 0 1 6 20z', 'M14 3.5V8h4', 'M9 12h6', 'M9 15.5h6'] },
};
export function icon(name) {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('class', 'icon');
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('fill', 'none');
  svg.setAttribute('stroke', 'currentColor');
  svg.setAttribute('stroke-width', '1.7');
  svg.setAttribute('stroke-linecap', 'round');
  svg.setAttribute('stroke-linejoin', 'round');
  const shape = ICONS[name];
  for (const d of (shape?.paths || [])) {
    const p = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    p.setAttribute('d', d); svg.append(p);
  }
  for (const [cx, cy, r] of (shape?.circles || [])) {
    const c = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    c.setAttribute('cx', cx); c.setAttribute('cy', cy); c.setAttribute('r', r); svg.append(c);
  }
  return svg;
}
export function emptyState(iconName, title, detail = '') {
  return el('div', { class: 'empty empty-state' }, icon(iconName), el('strong', {}, title), detail ? el('span', { class: 'empty-detail' }, detail) : null);
}
