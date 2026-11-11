/* ==========================================================================
   fallback.js — decide el modo de la experiencia ANTES de pintar.
   "cine"  : secuencias por scroll, pins, Lenis.
   "still" : una imagen fija por zona con fundidos suaves (movimiento reducido
             o conexión lenta / ahorro de datos).
   Forzar para pruebas: ?modo=fijo  |  ?modo=cine
   Se carga en <head>, sin dependencias.
   ========================================================================== */
(function () {
  var EV = (window.EV = window.EV || {});

  function detect() {
    var forced = new URLSearchParams(location.search).get('modo');
    if (forced === 'fijo') return { mode: 'still', reason: 'forzado' };
    if (forced === 'cine') return { mode: 'cine', reason: 'forzado' };

    if (window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches) {
      return { mode: 'still', reason: 'movimiento-reducido' };
    }
    var c = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
    if (c) {
      if (c.saveData) return { mode: 'still', reason: 'ahorro-datos' };
      if (/(^|-)(2g|3g)$/.test(c.effectiveType || '')) return { mode: 'still', reason: 'conexion-lenta' };
    }
    return { mode: 'cine', reason: 'por-defecto' };
  }

  var d = detect();
  EV.mode = d.mode;
  EV.modeReason = d.reason;
  EV.reducedMotion = !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
  document.documentElement.classList.add(d.mode === 'cine' ? 'is-cine' : 'is-still');

  /* Si el usuario cambia la preferencia de movimiento con la página abierta,
     recargamos en el modo correcto (un cambio de modo en caliente no compensa). */
  if (window.matchMedia) {
    var mq = matchMedia('(prefers-reduced-motion: reduce)');
    var onChange = function () { if (!new URLSearchParams(location.search).get('modo')) location.reload(); };
    if (mq.addEventListener) mq.addEventListener('change', onChange);
  }

  /* Modo fijo: una zona visible a la vez en el canvas, fundido entre zonas. */
  EV.fallback = {
    init: function () {
      if (EV.mode !== 'still') return;
      // El canvas (salas) y la fachada (DOM) se funden juntos.
      var canvas = [document.querySelector('.scene'), document.querySelector('.fachada-cam')].filter(Boolean);
      var fading = null;
      document.addEventListener('ev:zone', function (e) {
        var id = e.detail.id;
        if (fading) fading.kill();
        var dur = EV.reducedMotion ? 0.35 : 0.6;
        fading = gsap.timeline()
          .to(canvas, { opacity: 0, duration: dur * 0.5, ease: 'power2.in' })
          .add(function () { EV.stage.showStill(id); })
          .to(canvas, { opacity: 1, duration: dur, ease: 'power2.out' });
      });
    }
  };
})();
