/* ==========================================================================
   planes-home.js — #planes de la home, en negro sobre la red (desde
   backup-pre-puente; antes, en el gris: backup-pre-planes-gris). Script
   clásico, después de js/recorrido.js. Estilos: css/planes-home.css
   · El titular: las franjas de las letras de #lateral (EV.recorrido.Bloque, el
     mismo código), en orden de lectura, a medida que sube desde abajo de la
     pantalla. Las letras se montan en reposo tras la carga.
   · Las columnas entran con un fundido y 12 px al llegar a la pantalla, una
     tras otra (120 ms), una sola vez.
   · "Empezar con este plan": marca el plan (js/contacto/form.js lee data-plan)
     y, si el mensaje del formulario está vacío, escribe "Me interesa el plan …".
   · Posiciones cacheadas; un callback en gsap.ticker que no escribe nada con el
     scroll quieto.
   · Movimiento reducido o versión fija: todo visible, sin letras ni entradas.
   ========================================================================== */
(function () {
  var sec = document.querySelector('.pg');
  if (!sec) return;
  var EV = (window.EV = window.EV || {});
  var R = EV.recorrido || null;
  var quieto = EV.mode !== 'cine' || !R;
  var cl = function (v) { return v < 0 ? 0 : v > 1 ? 1 : v; };
  var scrollY = function () { var l = EV.home && EV.home.lenis; return l ? l.scroll : window.scrollY; };
  var arriba = function (el) { var y = 0, n = el; while (n) { y += n.offsetTop; n = n.offsetParent; } return y; };

  /* ---------- "Empezar con este plan": el mensaje del formulario ---------- */
  sec.addEventListener('click', function (e) {
    var a = e.target.closest('[data-plan-nombre]');
    if (!a) return;
    var m = document.getElementById('f-mensaje');
    if (m && !m.value.trim()) m.value = 'Me interesa el plan ' + a.dataset.planNombre + '.';
  });

  if (quieto) return;

  /* ---------- la entrada de las columnas ---------- */
  if ('IntersectionObserver' in window) {
    sec.classList.add('pg-vivo');
    var obs = new IntersectionObserver(function (es) {
      // las que entran a la vez, en orden de lectura (en móvil, Inmersión va la primera)
      var nuevas = es.filter(function (e) { return e.isIntersecting; }).map(function (e) { return { li: e.target, r: e.boundingClientRect }; });
      nuevas.sort(function (a, b) { return Math.round(a.r.top - b.r.top) || a.r.left - b.r.left; });
      nuevas.forEach(function (n, i) {
        obs.unobserve(n.li);
        n.li.style.setProperty('--d', i * 120 + 'ms');
        n.li.classList.add('is-dentro');
        setTimeout(function () { n.li.classList.add('is-hecho'); }, 950 + i * 120);
      });
    }, { threshold: .15, rootMargin: '0px 0px -6% 0px' });
    [].forEach.call(sec.querySelectorAll('.pg-plan'), function (li) { obs.observe(li); });
  }

  /* ---------- el titular ---------- */
  var tit = sec.querySelector('.pg-titulo'), letras = null, M = { vh: 0, tit: 0 }, ultima = null;
  function medir() {
    M.vh = window.innerHeight;
    M.tit = arriba(tit);
    if (letras) letras.ordenar();
    ultima = null;
  }
  function paso() {
    if (!letras) return;
    var y = scrollY();
    if (y === ultima) return;
    ultima = y;
    // se escribe mientras sube de un 88 % a un 46 % de la pantalla
    letras.escribir(cl((M.vh * .88 - (M.tit - y)) / (M.vh * .42)));
  }
  function montar() {
    if (letras || !R.Bloque || !tit) return;
    letras = new R.Bloque({ el: tit, W: 6 });
    letras.partir();
    medir();
  }

  medir();
  addEventListener('resize', medir);
  if (window.ResizeObserver) new ResizeObserver(medir).observe(document.body);
  if (document.fonts) document.fonts.ready.then(medir);
  if (window.gsap) gsap.ticker.add(function () { if (!document.hidden) paso(); });
  else (function f() { requestAnimationFrame(f); paso(); })();
  var cuando = window.requestIdleCallback || function (fn) { return setTimeout(fn, 300); };
  if (location.hash) montar();
  else addEventListener('load', function () { cuando(montar, { timeout: 2500 }); }, { once: true });
  addEventListener('scroll', function () { montar(); }, { once: true, passive: true });
})();
