/* ==========================================================================
   como.js — #como, "Cómo trabajamos" (desde backup-pre-puente). Script
   clásico, después de js/recorrido.js y js/para-quien.js. Estilos: css/como.css
   · Las tres palabras se escriben con las franjas de #lateral
     (EV.recorrido.Bloque, el mismo código), una tras otra, ligadas al scroll:
     palabra → flecha → palabra → flecha → palabra, en los 70vh en que el panel
     se queda quieto tras el cierre del gris (empieza un poco antes de que acabe,
     cuando ya casi solo queda la línea). Cada flecha se dibuja de izquierda a
     derecha (clip-path) y cada línea pequeña entra con un fundido (.6 s) cuando
     su palabra termina.
   · Posiciones cacheadas; un callback en gsap.ticker que no escribe nada con el
     scroll quieto. Las letras se montan en reposo tras la carga.
   · Movimiento reducido o versión fija: todo visible desde el principio.
   ========================================================================== */
(function () {
  var sec = document.getElementById('como');
  if (!sec) return;
  var EV = (window.EV = window.EV || {});
  var R = EV.recorrido || null;
  if (EV.mode !== 'cine' || !R) return;
  var cl = function (v) { return v < 0 ? 0 : v > 1 ? 1 : v; };
  var io = R.util.suaviza, escritor = R.util.escritor;
  var scrollY = function () { var l = EV.home && EV.home.lenis; return l ? l.scroll : window.scrollY; };
  var arriba = function (el) { var y = 0, n = el; while (n) { y += n.offsetTop; n = n.offsetParent; } return y; };

  sec.classList.add('como-viva');
  var pasos = [].slice.call(sec.querySelectorAll('.como-paso')).map(function (li) {
    var f = li.querySelector('.como-f');
    return { li: li, w: li.querySelector('.como-w'), b: null, flecha: f && escritor(f, 'clipPath'), escrita: false };
  });
  // los tramos, en unidades: palabra 1 · flecha .4 · palabra 1 · flecha .4 · palabra 1
  var PAL = 1, FLE = .4, TOTAL = pasos.length * PAL + (pasos.length - 1) * FLE;
  var M = { desde: 0, largo: 1 }, ultima = null, listo = false;

  function medir() {
    var vh = window.innerHeight;
    // con el cierre del gris: desde un poco antes de que acabe (EV.finGris) · sin él, al llegar #como
    var fin = EV.finGris ? EV.finGris() : arriba(sec);
    M.desde = fin - vh * .12;
    M.largo = vh * .62;
    pasos.forEach(function (p) { if (p.b) p.b.ordenar(); });
    ultima = null;
  }

  function paso() {
    if (!listo) return;
    var y = scrollY();
    if (y === ultima) return;
    ultima = y;
    var T = cl((y - M.desde) / M.largo) * TOTAL;
    pasos.forEach(function (p, i) {
      var t0 = i * (PAL + FLE);
      var w = cl((T - t0) / PAL);
      p.b.escribir(w);
      var hecha = w >= .98;
      if (hecha !== p.escrita) { p.escrita = hecha; p.li.classList.toggle('is-escrita', hecha); }
      if (p.flecha) {
        var a = io(cl((T - t0 - PAL) / FLE));
        p.flecha(a >= 1 ? 'none' : 'inset(0 ' + ((1 - a) * 100).toFixed(2) + '% 0 0)');
      }
    });
  }

  // las letras, en el primer momento libre tras la carga (o ya, si se llega con un ancla)
  function montar() {
    if (listo) return;
    listo = true;
    pasos.forEach(function (p) { p.b = new R.Bloque({ el: p.w, W: 6 }); p.b.partir(); });
    medir();
  }

  addEventListener('resize', medir);
  if (window.ResizeObserver) new ResizeObserver(function () { if (listo) medir(); }).observe(document.body);
  if (document.fonts) document.fonts.ready.then(function () { if (listo) medir(); });
  if (window.gsap) gsap.ticker.add(function () { if (!document.hidden) paso(); });
  else (function f() { requestAnimationFrame(f); paso(); })();
  var cuando = window.requestIdleCallback || function (fn) { return setTimeout(fn, 300); };
  if (location.hash) montar();
  else addEventListener('load', function () { cuando(montar, { timeout: 2500 }); }, { once: true });
  addEventListener('scroll', function () { montar(); }, { once: true, passive: true });
})();
