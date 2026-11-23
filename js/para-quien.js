/* ==========================================================================
   para-quien.js — #para-quien, "Con quién trabajamos y nuestro trabajo"
   (desde backup-pre-fusion). Script clásico, después de js/recorrido.js.
   · Pestañas (role="tablist"): clic, flechas izquierda/derecha, Inicio y Fin.
     Las dos opciones están en el HTML; la que no toca lleva [hidden] y ocupa
     el mismo sitio (css/para-quien.css): cambiar no mueve el scroll.
   · Iguala el alto de los titulares y de los párrafos de las dos opciones,
     para que la tarjeta del caso quede en el mismo sitio en las dos.
   · Animaciones, una cada vez y ligadas al scroll (ninguna en bucle):
       titular  las tres franjas de #lateral (EV.recorrido.Bloque), en orden de
                lectura. Mientras baja la persiana, al ritmo de lo que descubre.
       párrafo  fundido línea a línea (EV.recorrido.Lineas).
       puntos   una línea de 1 px se dibuja encima de cada uno y su texto
                aparece, uno tras otro.
       tarjeta  se revela de abajo arriba (clip-path) y el dispositivo gira de
                -6° a 0° mientras la cruza (EV.giroCaso, lo leen
                js/trabajo-selecto.js y js/caso-leons.js).
       datos    los de PageSpeed cuentan hasta su valor, una vez.
   · Al cambiar de pestaña (por tiempo, sin mover el scroll): el titular se
     borra (.22 s) y se reescribe (.45 s); la tarjeta, un barrido de tres
     franjas (.5 s, el cambio a la mitad); el párrafo y los puntos, un fundido.
   · Posiciones cacheadas (sin lecturas de layout por fotograma); un callback
     en gsap.ticker que no calcula con la sección lejos.
   · Movimiento reducido o versión fija: todo visible desde el principio.
   ========================================================================== */
(function () {
  var sec = document.querySelector('[data-pq]');
  if (!sec) return;
  var EV = (window.EV = window.EV || {});
  var R = EV.recorrido || null;
  var quieto = EV.mode !== 'cine' || !R;
  var cl = function (v) { return v < 0 ? 0 : v > 1 ? 1 : v; };
  var tramo = function (v, a, b) { return cl((v - a) / (b - a)); };
  var suave = function (t) { return 1 - Math.pow(1 - t, 3); };
  var $$ = function (s, c) { return [].slice.call((c || sec).querySelectorAll(s)); };
  var escritor = R ? R.util.escritor : function (el, p) { return function (v) { el.style[p] = v; }; };
  var scrollY = function () { var l = EV.home && EV.home.lenis; return l ? l.scroll : window.scrollY; };

  var lista = sec.querySelector('[role="tablist"]'), pestanas = $$('[role="tab"]', lista), paneles = $$('[role="tabpanel"]');
  var cab = document.querySelector('.cabecera');
  var op = 0;

  sec.classList.add('pq-viva');
  if (!quieto) sec.classList.add('pq-vivo');

  /* ---------- lo animable de cada opción ---------- */
  var opciones = paneles.map(function (p) {
    var O = {
      panel: p,
      h: p.querySelector('.pq-h'), p: p.querySelector('.pq-p'), puntos: p.querySelector('.pq-puntos'), caso: p.querySelector('.pq-caso'),
      k: 1
    };
    if (!quieto) {
      O.titulo = new R.Bloque({ el: O.h, W: 7 });
      O.parrafo = new R.Lineas({ el: O.p, W: 1.3 });
      O.lineas = $$('.pq-puntos__linea', p).map(function (e) { return escritor(e, 'transform'); });
      O.textos = $$('.pq-puntos__t', p).map(function (e) { return escritor(e, 'opacity'); });
      O.clip = escritor(O.caso, 'clipPath');
      O.psi = $$('.ts-psi__g', p).map(function (li) {
        var b = li.querySelector('b'), arco = li.querySelector('.ts-psi__arco');
        return { b: b, arco: arco, v: parseFloat(b.textContent) || 0 };
      });
    }
    return O;
  });

  /* ---------- las pestañas ---------- */
  var cambio = null;                         // { a, t } mientras dura el cambio (segundos)
  function mostrar(i) {
    paneles.forEach(function (p, k) { p.hidden = k !== i; });
    op = i;
    var O = opciones[i];
    if (O.titulo) { O.titulo.ordenar(); O.parrafo.ordenar(); }
  }
  function elegir(i, foco) {
    var actual = cambio ? cambio.a : op;
    if (i === actual && !cambio) return;
    lista.dataset.v = i;
    pestanas.forEach(function (b, k) { b.setAttribute('aria-selected', String(k === i)); b.tabIndex = k === i ? 0 : -1; });
    if (foco) pestanas[i].focus({ preventScroll: true });
    if (quieto) { mostrar(i); return; }
    if (cambio) { cambio.a = i; return; }                 // ya cambiando: va a la última que se pidió
    cambio = { a: i, t: 0, hecho: false };
    opciones.forEach(function (O) {                       // el barrido, en las dos tarjetas a la vez (están en el mismo sitio)
      O.caso.classList.remove('barre'); void O.caso.offsetWidth; O.caso.classList.add('barre');
    });
    setTimeout(function () { opciones.forEach(function (O) { O.caso.classList.remove('barre'); }); }, 620);
  }
  pestanas.forEach(function (b, i) { b.addEventListener('click', function () { elegir(i); }); });
  lista.addEventListener('keydown', function (e) {
    var actual = cambio ? cambio.a : op;
    var n = { ArrowRight: actual + 1, ArrowLeft: actual - 1, Home: 0, End: pestanas.length - 1 }[e.key];
    if (n === undefined) return;
    e.preventDefault();
    elegir((n + pestanas.length) % pestanas.length, true);
  });

  /* ---------- medidas (solo al cambiar el tamaño) ---------- */
  var M = { top: 0, alto: 0, vh: 0, tit: 0, titH: 0, par: 0, pts: 0, caso: 0, casoH: 0, pestanasTop: 64 };
  function arriba(el) { var y = 0, n = el; while (n) { y += n.offsetTop; n = n.offsetParent; } return y; }
  function igualar() {
    ['.pq-h', '.pq-p'].forEach(function (s) {
      var els = $$(s);
      els.forEach(function (e) { e.style.minHeight = ''; });
      var alto = Math.max.apply(null, els.map(function (e) { return e.offsetHeight; }));
      els.forEach(function (e) { e.style.minHeight = alto + 'px'; });
    });
  }
  function medir() {
    igualar();
    var O = opciones[0];
    M.vh = window.innerHeight;
    M.top = arriba(sec);
    M.alto = sec.offsetHeight;
    M.tit = arriba(O.h); M.titH = O.h.offsetHeight;
    M.par = arriba(O.p);
    M.pts = arriba(O.puntos);
    M.caso = arriba(O.caso); M.casoH = O.caso.offsetHeight;
    M.pestanasTop = parseFloat(getComputedStyle(lista).top) || 64;
    M.pestanasH = lista.offsetHeight;
    opciones.forEach(function (o) { if (o.titulo) { o.titulo.ordenar(); o.parrafo.ordenar(); } });
    sucio = true;
  }

  /* ---------- montar las letras (en reposo) ---------- */
  var listas = false;
  function montar() {
    if (listas || quieto) return;
    listas = true;
    opciones.forEach(function (O) { O.titulo.partir(); O.parrafo.partir(); });
    medir();
    // los datos de PageSpeed: desde 0 hasta que se ven (js/trabajo-selecto.js ya puso sus valores reales)
    opciones.forEach(function (O) {
      O.psi.forEach(function (d) { d.v = parseFloat(d.b.textContent) || d.v; if (!contados) { d.b.textContent = '0'; d.arco.style.setProperty('--v', 0); } });
    });
  }
  var contados = false, cuenta = null;

  /* ---------- el bucle ---------- */
  var sucio = true, ultimaY = null, fijas = null;
  var tapadas = null;
  function cabecera(y, dy) {
    // las pestañas van por encima de la persiana (y de las ondas): mientras el naranja no ha pasado de ellas, ocultas
    var c = sec.__cortina, tap = c != null && c < M.pestanasTop + M.pestanasH;
    if (tap !== tapadas) { tapadas = tap; lista.classList.toggle('bajo-persiana', tap); }
    if (!cab) return;
    var arribaSec = M.top + dy - y, abajoSec = arribaSec + M.alto;
    var on = arribaSec <= 0.5 && abajoSec > M.pestanasTop + M.pestanasH;
    if (on !== fijas) { fijas = on; cab.classList.toggle('is-pestanas', on); }
  }
  function vuelta(t, dms) {
    if (document.hidden) return;
    var y = scrollY(), dy = sec.__dy || 0;
    cabecera(y, dy);
    if (quieto) return;
    if (!listas) return;
    var dt = Math.min(.1, (dms || 16.7) / 1000);
    var cerca = M.top + dy - y < M.vh * 1.2 && M.top + M.alto + dy - y > -M.vh * .2;
    if (!cerca && !cambio && !cuenta && !sucio) return;
    if (!sucio && !cambio && !cuenta && y === ultimaY && dy === (vuelta.dy || 0) && sec.__cortina == null) return;
    ultimaY = y; vuelta.dy = dy; sucio = false;

    // lo que se ve: hasta abajo de la pantalla o, mientras baja la persiana, hasta su borde
    var tope = sec.__cortina != null ? sec.__cortina : M.vh;
    var entra = function (docTop) { return tope - (docTop - y + dy); };

    // el cambio de pestaña, por tiempo
    if (cambio) {
      cambio.t += dt;
      var sale = opciones[op];
      if (!cambio.hecho) {
        sale.k = Math.max(0, 1 - cambio.t / .22);
        if (cambio.t >= .25) { cambio.hecho = true; if (cambio.a !== op) { mostrar(cambio.a); opciones[op].k = 0; } }
      } else {
        var entra0 = opciones[op];
        entra0.k = Math.min(1, entra0.k + dt / .45);
        if (cambio.a !== op) { cambio = { a: cambio.a, t: 0, hecho: false }; opciones.forEach(function (O) { O.caso.classList.remove('barre'); void O.caso.offsetWidth; O.caso.classList.add('barre'); }); }
        else if (entra0.k >= 1) cambio = null;
      }
    }

    var Pt = tramo(entra(M.tit), M.vh * .04, M.vh * .04 + Math.max(M.titH * 1.05, M.vh * .3));
    var Pp = tramo(entra(M.par), M.vh * .06, M.vh * .38);
    var Ppts = tramo(entra(M.pts), M.vh * .04, M.vh * .36);
    var Pc = suave(tramo(entra(M.caso), 0, M.vh * .4));
    var giro = -6 * Math.PI / 180 * (1 - tramo(entra(M.caso), 0, M.vh * .9));
    EV.giroCaso = giro;

    opciones.forEach(function (O, i) {
      var activa = i === op;
      O.titulo.escribir(activa ? Pt * O.k : 0);
      O.parrafo.escribir(Pp);
      var n = O.lineas.length;
      for (var j = 0; j < n; j++) {
        var a = j * .18;
        O.lineas[j]('scaleX(' + suave(tramo(Ppts, a, a + .28)).toFixed(4) + ')');
        O.textos[j](suave(tramo(Ppts, a + .18, a + .4)).toFixed(3));
      }
      O.clip(Pc >= 1 ? 'none' : 'inset(' + ((1 - Pc) * 100).toFixed(2) + '% 0 0 0)');
    });

    // los datos de PageSpeed: cuentan una sola vez, la primera vez que se ven
    if (!contados && op === 0 && Pc > .85) { contados = true; cuenta = { t: 0 }; }
    if (cuenta) {
      cuenta.t += dt;
      var k = suave(cl(cuenta.t / .7));
      opciones.forEach(function (O) { O.psi.forEach(function (d) { d.b.textContent = String(Math.round(d.v * k)); d.arco.style.setProperty('--v', (d.v * k).toFixed(1)); }); });
      if (k >= 1) cuenta = null;
    }
  }

  medir();
  addEventListener('resize', function () { medir(); });
  if (window.ResizeObserver) new ResizeObserver(function () { M.top = arriba(sec); M.alto = sec.offsetHeight; sucio = true; }).observe(document.body);
  if (document.fonts) document.fonts.ready.then(medir);
  if (window.gsap) gsap.ticker.add(vuelta); else (function f() { requestAnimationFrame(f); vuelta(); })();

  // las letras se montan en el primer momento libre tras la carga (o ya, si se llega con un ancla)
  var cuando = window.requestIdleCallback || function (fn) { return setTimeout(fn, 300); };
  if (location.hash) montar();
  else addEventListener('load', function () { cuando(montar, { timeout: 2500 }); }, { once: true });
  addEventListener('scroll', function () { montar(); }, { once: true, passive: true });

  EV.paraQuien = { elegir: elegir, medir: medir, montar: montar };
})();
