/* ==========================================================================
   planes-gris.js — #planes de la home en el capítulo gris (desde
   backup-pre-planes-gris). Script clásico, después de js/recorrido.js y
   js/para-quien.js. Estilos: css/planes-gris.css
   · El titular: las franjas de las letras de #lateral (EV.recorrido.Bloque, el
     mismo código), en orden de lectura, a medida que sube desde abajo de la
     pantalla. Las letras se montan en reposo tras la carga.
   · Las columnas entran con un fundido y 12 px al llegar a la pantalla, una
     tras otra (120 ms), una sola vez.
   · "Empezar con este plan": marca el plan (js/contacto/form.js lee data-plan)
     y, si el mensaje del formulario está vacío, escribe "Me interesa el plan …".
   · El cierre del gris (.pg-fin), espejo de la apertura de #lateral: el gris,
     fijo a la pantalla, se estrecha de arriba y abajo hasta una línea de 1 px,
     que se recoge hacia el centro y se desvanece, en 60vh de scroll (suavizado
     9). Detrás ya está el contacto, en negro sobre la red (css: margin-top
     −100lvh, el alto del pin); el contenido de #planes (por encima del pin) se
     va al empezar a cerrarse. La cabecera, oscura en cuanto el negro llega a
     su línea (EV.cabeceraOscura). EV.finGris(): el scroll en que acaba el
     cierre (a donde salta el ancla #contacto).
   · Posiciones cacheadas (sin lecturas de layout por fotograma); un callback en
     gsap.ticker que no escribe nada con el scroll quieto.
   · Movimiento reducido o versión fija: todo visible, sin cierre (corte limpio
     del gris al negro).
   ========================================================================== */
(function () {
  var sec = document.querySelector('.pg');
  if (!sec) return;
  var EV = (window.EV = window.EV || {});
  var R = EV.recorrido || null;
  var quieto = EV.mode !== 'cine' || !R;
  var cl = function (v) { return v < 0 ? 0 : v > 1 ? 1 : v; };
  var io = R ? R.util.suaviza : function (t) { return t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; };
  var escritor = R ? R.util.escritor : function (el, p) { return function (v) { el.style[p] = v; }; };
  var scrollY = function () { var l = EV.home && EV.home.lenis; return l ? l.scroll : window.scrollY; };
  var arriba = function (el) { var y = 0, n = el; while (n) { y += n.offsetTop; n = n.offsetParent; } return y; };

  /* ---------- "Empezar con este plan": el mensaje del formulario ---------- */
  sec.addEventListener('click', function (e) {
    var a = e.target.closest('[data-plan-nombre]');
    if (!a) return;
    var m = document.getElementById('f-mensaje');
    if (m && !m.value.trim()) m.value = 'Me interesa el plan ' + a.dataset.planNombre + '.';
  });

  /* ---------- la entrada de las columnas ---------- */
  var cols = [].slice.call(sec.querySelectorAll('.pg-plan'));
  if (!quieto && 'IntersectionObserver' in window) {
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
    cols.forEach(function (li) { obs.observe(li); });
  }

  if (quieto) return;

  /* ---------- el titular y el cierre ---------- */
  var tit = sec.querySelector('.pg-titulo'), letras = null;
  var fin = sec.querySelector('.pg-fin'), cont = sec.querySelector('.pg-cont');
  var pin = fin && fin.querySelector('.pg-fin__pin'), gris = fin && fin.querySelector('.pg-fin__gris');
  var pon = fin ? { clip: escritor(gris, 'clipPath'), grisO: escritor(gris, 'opacity'), contO: escritor(cont, 'opacity') } : null;
  if (fin) sec.classList.add('pg-cierra');
  var M = { vh: 0, tit: 0, top: 0, alto: 0, pin: 0 }, c = 0, ultima = null, cerrando = false;

  function medir() {
    M.vh = window.innerHeight;
    M.tit = arriba(tit);
    if (fin) { M.top = arriba(fin); M.alto = fin.offsetHeight; M.pin = pin.offsetHeight; }
    if (letras) letras.ordenar();
    ultima = null;
  }
  EV.finGris = fin ? function () { medir(); return M.top + M.alto - M.pin; } : null;

  function bandera(nombre, v) {
    if (!!EV[nombre] === v) return;
    EV[nombre] = v;
    if (EV.home && EV.home.refrescar) EV.home.refrescar();
  }

  function paso(dt) {
    var y = scrollY(), vh = M.vh;
    // 0 = gris a pantalla completa · 1 = negro (lo que dura el pin: 60vh)
    var cm = fin ? cl((y - M.top) / Math.max(1, M.alto - M.pin)) : 0;
    if (y === ultima && c === cm) return;              // quieto y asentado
    ultima = y;
    // el titular se escribe mientras sube de un 88 % a un 46 % de la pantalla
    if (letras) letras.escribir(cl((vh * .88 - (M.tit - y)) / (vh * .42)));
    if (!fin) return;
    c += (cm - c) * (1 - Math.exp(-dt * 9));
    if (Math.abs(cm - c) < 1e-4) c = cm;
    // primero se estrecha de arriba y abajo hasta 1 px; después la línea se recoge al centro y se va
    var a = io(cl(c / .55)), b = io(cl((c - .5) / .5));
    var v = (a * 50).toFixed(2), px = (a * .5).toFixed(2), lados = (b * 50).toFixed(2);
    pon.clip(c <= 0 ? 'none' : 'inset(calc(' + v + '% - ' + px + 'px) ' + lados + '% calc(' + v + '% - ' + px + 'px) ' + lados + '%)');
    pon.grisO(c <= 0 ? '' : (1 - b).toFixed(3));
    // el contenido (por encima del pin) se va antes de que la franja gris lo deje fuera
    pon.contO(c <= 0 ? '' : (1 - cl(c / .26)).toFixed(3));
    if ((c > .2) !== cerrando) { cerrando = c > .2; sec.classList.toggle('pg-cerrando', cerrando); }
    // la cabecera: oscura en cuanto el negro llega a su línea central, y mientras el cierre (ya negro) siga bajo ella
    bandera('cabeceraOscura', y >= M.top && y < M.top + M.alto && a * vh / 2 > 32);
  }

  // las letras del titular, en el primer momento libre tras la carga (o ya, si se llega con un ancla)
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
  if (window.gsap) gsap.ticker.add(function (t, dms) { if (!document.hidden) paso(Math.min(.1, (dms || 16.7) / 1000)); });
  else (function f() { requestAnimationFrame(f); paso(1 / 60); })();
  var cuando = window.requestIdleCallback || function (fn) { return setTimeout(fn, 300); };
  if (location.hash) montar();
  else addEventListener('load', function () { cuando(montar, { timeout: 2500 }); }, { once: true });
  addEventListener('scroll', function () { montar(); }, { once: true, passive: true });
})();
