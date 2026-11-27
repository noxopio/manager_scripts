// Aplica el color de acento guardado antes de pintar la página (script clásico y síncrono en <head>,
// para que no se vea un parpadeo del violeta por defecto). El selector está en el pie del panel lateral (sidebar.js).
(function () {
  try {
    var accent = localStorage.getItem('mfs.accent');
    if (accent && accent !== 'violeta') document.documentElement.setAttribute('data-accent', accent);
  } catch (e) { /* sin localStorage: violeta */ }
})();
