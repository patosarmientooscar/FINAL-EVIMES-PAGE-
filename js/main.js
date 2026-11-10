/* ==========================================================================
   main.js — arranque. Orden del tick único (gsap.ticker):
     1. Lenis.raf            (prioritario, en lenis.js) → ScrollTrigger.update
     2. zones.flush          progreso → canvas y oyentes de capas
     3. sequence.render      dibuja el fotograma (solo si cambió)
     4. overlay.update       cartelas y pantallas, sincronizadas con lo dibujado
   ========================================================================== */
(function () {
  var EV = window.EV;

  /* Textos desde js/content.js (el HTML lleva el mismo texto para SEO/no-JS). */
  function bindContent() {
    document.querySelectorAll('[data-c]').forEach(function (el) {
      var v = EV.util.content(el.dataset.c);
      if (typeof v === 'string') el.textContent = v;
    });
  }

  function boot() {
    gsap.registerPlugin(ScrollTrigger);
    ScrollTrigger.config({ ignoreMobileResize: true });
    if ('scrollRestoration' in history) history.scrollRestoration = 'manual';

    bindContent();
    EV.scroll.init();
    EV.sequence.init(document.querySelector('.scene'));
    EV.zones.init();

    EV.zones.all().forEach(function (z) {
      var s = EV.zoneScripts[z.cfg.id];
      if (s && s.init) s.init(z);
    });

    EV.fallback.init();
    EV.header.init();

    gsap.ticker.add(function () {
      EV.zones.flush();
      EV.sequence.render();
      EV.overlay.update();
    });

    // Las fuentes cambian métricas y el placeholder dibuja texto.
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(function () {
        ScrollTrigger.refresh();
        EV.sequence.invalidate();
      });
    }
    document.documentElement.classList.add('is-ready');
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
