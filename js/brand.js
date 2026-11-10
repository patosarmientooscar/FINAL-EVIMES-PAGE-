/* ==========================================================================
   brand.js — logo de la cabecera desde js/config.js.
   - logo.svg vacío  → logotipo provisional en HTML (logo.text).
   - logo.svg = ruta → se incrusta el SVG en línea (así hereda currentColor).
   Cambiar el logo = cambiar una línea en config.js.
   ========================================================================== */
(function () {
  var cfg = (window.EVIMES_CONFIG && window.EVIMES_CONFIG.logo) || {};
  var brands = document.querySelectorAll('.brand');
  if (!brands.length) return;

  if (!cfg.svg) {
    if (cfg.text) brands.forEach(function (a) { a.textContent = cfg.text; });
    return;
  }

  fetch(cfg.svg)
    .then(function (r) { return r.ok ? r.text() : Promise.reject(r.status); })
    .then(function (txt) {
      var doc = new DOMParser().parseFromString(txt, 'image/svg+xml');
      var svg = doc.documentElement;
      if (!svg || svg.nodeName.toLowerCase() !== 'svg') return;
      // Higiene: nada ejecutable dentro del logo.
      svg.querySelectorAll('script, foreignObject').forEach(function (n) { n.remove(); });
      svg.setAttribute('aria-hidden', 'true');
      svg.setAttribute('focusable', 'false');
      svg.removeAttribute('width');
      svg.removeAttribute('height');
      svg.classList.add('brand__svg');
      brands.forEach(function (a) {
        a.textContent = '';
        a.appendChild(document.importNode(svg, true));
        a.classList.add('brand--svg');
      });
    })
    .catch(function () { /* se queda el provisional en HTML */ });
})();
