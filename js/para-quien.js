/* ==========================================================================
   para-quien.js — #para-quien, "Con quién trabajamos y nuestro trabajo"
   (desde backup-pre-para-quien; prototipo aprobado Downloads/evimes-para-quien).
   Script clásico, después de js/recorrido.js.
   · LA FRASE ES EL INTERRUPTOR: los dos públicos son <button aria-pressed>;
     clic o flechas izquierda/derecha. Por defecto, agencias. La frase no se anima.
   · La anotación "pulsa" (.pq-nudge): pegada al público en gris (a su derecha
     en escritorio, debajo en móvil), recolocada al cambiar el tamaño y al
     cargar las fuentes; al cambiar de público salta al otro con un fundido.
     Al entrar la sección en pantalla, la flecha da dos empujones (.8 s, una
     vez). Tras el primer cambio se va y no vuelve en la visita (sessionStorage).
   · Los dos públicos están en el HTML (el que no toca, con hidden, maquetado
     encima y fuera del flujo: css/para-quien.css): cambiar no mueve el scroll.
     Se iguala el alto de sus dos columnas, para que las ventanas empiecen a la
     misma altura; al cambiar, Lenis se entera del alto nuevo.
   · Animaciones, una cada vez y ligadas al scroll (ninguna en bucle):
       textos   el problema, lo que hacemos (W 10) y el cierre (W 6): las tres
                franjas de #lateral (EV.recorrido.Bloque, el mismo código), en
                orden de lectura, a medida que suben desde abajo de la pantalla.
                Mientras baja la persiana, al ritmo de lo que descubre.
       ventana  una línea de 1 px cruza y se abre en la ventana negra (clip-path
                en dos fases, suavizado); el dispositivo sube 30 px a su sitio.
       anillos  cuando la ventana termina de abrirse, cada arco se rellena de 0 a
                su valor real (1,1 s, ease-out) mientras su número cuenta; uno
                tras otro (120 ms). Solo la primera vez.
   · Al cambiar de público (por tiempo, sin mover el scroll): los textos se
     borran (.35 s) y la ventana se cierra en línea; se cambia el contenido y
     todo vuelve a escribirse y abrirse (.8 s).
   · Posiciones cacheadas (sin lecturas de layout por fotograma); un callback
     en gsap.ticker que no calcula con la sección lejos ni quieta.
   · Movimiento reducido o versión fija: todo visible desde el principio.
   ========================================================================== */
(function () {
  var sec = document.querySelector('[data-pq]');
  if (!sec) return;
  var EV = (window.EV = window.EV || {});
  var R = EV.recorrido || null;
  var quieto = EV.mode !== 'cine' || !R;
  var cl = function (v) { return v < 0 ? 0 : v > 1 ? 1 : v; };
  var sale = function (t) { return 1 - Math.pow(1 - t, 3); };                                     // ease-out
  var io = R ? R.util.suaviza : function (t) { return t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; };   // ease-in-out
  var escritor = R ? R.util.escritor : function (el, p) { return function (v) { el.style[p] = v; }; };
  var scrollY = function () { var l = EV.home && EV.home.lenis; return l ? l.scroll : window.scrollY; };
  var $$ = function (s, c) { return [].slice.call((c || sec).querySelectorAll(s)); };
  var arriba = function (el) { var y = 0, n = el; while (n) { y += n.offsetTop; n = n.offsetParent; } return y; };
  var C = 339.292;                                // el perímetro de los anillos (r 54)

  var botones = $$('.pq-aud'), frase = sec.querySelector('.pq-switch');
  var aud = 'ag', pendiente = null;

  sec.classList.add('pq-viva');
  if (!quieto) sec.classList.add('pq-vivo');

  /* ---------- lo animable de cada público ---------- */
  var auds = {};
  $$('[data-aud]').forEach(function (p) {
    var win = p.querySelector('.pq-window'), stage = win.querySelector('.pq-stage'), info = win.querySelector('.pq-info');
    var A = auds[p.dataset.aud] = { panel: p, win: win, winTop: 0, bloques: [], anillos: [] };
    if (quieto) return;
    A.bloques = $$('[data-type]', p).map(function (el) {
      var flecha = el.parentNode.querySelector('.pq-cta__arr svg');
      return { el: el, start: parseFloat(el.dataset.start) || .88, top: 0, b: new R.Bloque({ el: el, W: parseFloat(el.dataset.type) || 8 }), flecha: flecha && escritor(flecha, 'opacity') };
    });
    A.clip = escritor(win, 'clipPath');
    A.stage = escritor(stage, 'transform');
    A.info = escritor(info, 'transform');
    A.anillos = $$('.pq-psi__g', p).map(function (li) {
      return { li: li, b: li.querySelector('b'), arco: li.querySelector('.pq-psi__arco'), v: 0 };
    });
  });

  /* ---------- el interruptor ---------- */
  var swap = 1, meta = 1;                         // 1: escrito y abierto · 0: borrado y cerrado (el cambio)
  function aplicar(n) {
    aud = n; pendiente = null;
    Object.keys(auds).forEach(function (k) { auds[k].panel.hidden = k !== n; });
    sec.dataset.active = n;
    if (EV.home && EV.home.lenis) EV.home.lenis.resize();
    sucio = true;
  }
  function elegir(n, foco) {
    botones.forEach(function (b) { b.setAttribute('aria-pressed', String(b.dataset.for === n)); });
    if (foco) botones.filter(function (b) { return b.dataset.for === n; })[0].focus({ preventScroll: true });
    if (n === (pendiente || aud)) return;
    nudge.cambio();
    if (quieto) { aplicar(n); return; }
    if (n === aud) { pendiente = null; meta = 1; return; }    // vuelve antes de que dé tiempo a cambiar
    pendiente = n; meta = 0;
  }
  botones.forEach(function (b) { b.addEventListener('click', function () { elegir(b.dataset.for); }); });
  frase.addEventListener('keydown', function (e) {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
    e.preventDefault();
    elegir((pendiente || aud) === 'ag' ? 'nl' : 'ag', true);
  });

  /* ---------- la anotación "pulsa" ---------- */
  var nudge = (function () {
    var el = sec.querySelector('.pq-nudge'), cabeza = sec.querySelector('.pq-cabeza');
    var CLAVE = 'evimes-pq-pulsado', visto = false, salto = null;
    var nada = { cambio: function () {}, colocar: function () {} };
    if (!el || !cabeza) return nada;
    try { visto = sessionStorage.getItem(CLAVE) === '1'; } catch (e) {}
    if (visto) { el.remove(); return nada; }
    function colocar() {
      var b = botones.filter(function (k) { return k.getAttribute('aria-pressed') === 'false'; })[0];
      if (!b) return;
      var c = cabeza.getBoundingClientRect(), r = b.getBoundingClientRect();
      var ancho = el.offsetWidth || 96, cabe = r.right - c.left + 14 + ancho <= c.width;
      var abajo = window.innerWidth <= 860 || !cabe;
      el.classList.toggle('is-abajo', abajo);
      var x = abajo ? r.left - c.left + Math.min(40, r.width * .15) : r.right - c.left + 14;
      var y = abajo ? r.bottom - c.top + 2 : r.top - c.top + r.height * .52 - 14;
      el.style.transform = 'translate3d(' + Math.round(x) + 'px,' + Math.round(y) + 'px,0)';
      el.classList.add('is-lista');
    }
    function cambio() {
      if (!visto) { visto = true; try { sessionStorage.setItem(CLAVE, '1'); } catch (e) {} }
      // salta al otro botón con un fundido; tras el primer cambio ya no vuelve a aparecer
      el.classList.add('is-fuera');
      clearTimeout(salto);
      salto = setTimeout(function () { colocar(); if (!visto) el.classList.remove('is-fuera'); }, 300);
    }
    // los dos empujones, una vez, cuando la frase está a la vista (y no bajo el naranja de la persiana)
    if (window.IntersectionObserver) {
      var io = new IntersectionObserver(function (es) {
        if (!es[0].isIntersecting) return;
        io.disconnect();
        (function espera() {
          var c = sec.__cortina, r = el.getBoundingClientRect();
          if (c != null && c < r.bottom) { requestAnimationFrame(espera); return; }
          el.classList.add('is-empuja');
        })();
      }, { threshold: .9 });
      io.observe(el);
    }
    return { cambio: cambio, colocar: colocar };
  })();

  /* ---------- medidas (solo al cambiar el tamaño) ---------- */
  var M = { vh: 0, top: 0, alto: 0 };
  function igualar() {
    var els = $$('.pq-talk');
    els.forEach(function (e) { e.style.minHeight = ''; });
    var alto = Math.max.apply(null, els.map(function (e) { return e.offsetHeight; }));
    els.forEach(function (e) { e.style.minHeight = alto + 'px'; });
  }
  function posiciones() {
    M.top = arriba(sec); M.alto = sec.offsetHeight;
    Object.keys(auds).forEach(function (k) {
      var A = auds[k];
      A.winTop = arriba(A.win);
      A.bloques.forEach(function (b) { b.top = arriba(b.el); });
    });
    sucio = true;
  }
  function medir() {
    igualar();
    nudge.colocar();
    M.vh = window.innerHeight;
    posiciones();
    if (listas) Object.keys(auds).forEach(function (k) { auds[k].bloques.forEach(function (b) { b.b.ordenar(); }); });
  }

  /* ---------- montar las letras (en reposo) ---------- */
  var listas = false;
  function montar() {
    if (listas || quieto) return;
    listas = true;
    Object.keys(auds).forEach(function (k) {
      var A = auds[k];
      A.bloques.forEach(function (b) { b.b.partir(); });
      // los anillos, desde 0 (js/trabajo-selecto.js ya puso los valores reales en data-v)
      A.anillos.forEach(function (d) {
        d.v = parseFloat(d.li.dataset.v) || parseFloat(d.b.textContent) || 0;
        d.li.classList.add('is-contando');
        d.ponB = (function (el) { var u; return function (v) { if (v !== u) { u = v; el.textContent = v; } }; })(d.b);
        d.ponArco = escritor(d.arco, 'strokeDashoffset');
        d.ponB('0'); d.ponArco(C + 'px');
      });
    });
    medir();
  }

  /* ---------- el bucle ---------- */
  var sucio = true, ultimaY = null, ultimaDy = null, o = 0, oMeta = 0, abierta = false, contados = false, cuenta = null;
  function vuelta(t, dms) {
    if (document.hidden || quieto || !listas) return;
    var dt = Math.min(.1, (dms || 16.7) / 1000);
    var y = scrollY(), dy = sec.__dy || 0, cort = sec.__cortina;
    var anima = pendiente !== null || swap !== meta || cuenta !== null || Math.abs(oMeta - o) > 1e-4;
    var cerca = M.top + dy - y < M.vh * 1.2 && M.top + M.alto + dy - y > -M.vh * .2;
    if (!cerca && !anima && !sucio) return;
    if (!sucio && !anima && y === ultimaY && dy === ultimaDy && cort == null) return;
    ultimaY = y; ultimaDy = dy; sucio = false;

    // el cambio de público: borrar deprisa (.35 s), cambiar, escribir otra vez (.8 s)
    if (swap > meta) swap = Math.max(meta, swap - dt / .35);
    else if (swap < meta) swap = Math.min(meta, swap + dt / .8);
    if (pendiente && swap <= 0) {
      // el que sale, borrado del todo: sus letras a medio cruzar llevan visibility: visible y se verían en el panel oculto
      auds[aud].bloques.forEach(function (b) { b.b.escribir(0); if (b.flecha) b.flecha('0'); });
      aplicar(pendiente); meta = 1;
    }

    var A = auds[aud];
    // lo que se ve: hasta abajo de la pantalla o, mientras baja la persiana, hasta su borde
    var tope = cort != null ? cort : M.vh;
    var enPantalla = function (docTop) { return docTop - y + dy; };

    // los textos se escriben a medida que suben desde abajo de la pantalla
    A.bloques.forEach(function (b) {
      var P = Math.min(swap, cl((tope - M.vh * (1 - b.start) - enPantalla(b.top)) / (M.vh * .42)));
      b.b.escribir(P);
      if (b.flecha) { var f = cl((P - .82) / .18); b.flecha((f * f * (3 - 2 * f)).toFixed(3)); }
    });

    // la ventana: la línea cruza (la) y se abre (lb)
    oMeta = Math.min(swap, cl((tope - M.vh * .08 - enPantalla(A.winTop)) / (M.vh * .55)));
    o += (oMeta - o) * (1 - Math.exp(-dt * 8));
    if (Math.abs(oMeta - o) <= 1e-4) o = oMeta;
    var la = io(cl(o / .3)), lb = io(cl((o - .24) / .76));
    var lado = (1 - la) * 50, tb = (1 - lb) * 50, px = (1 - lb) * .5;
    A.clip(la >= 1 && lb >= 1 ? 'none' : 'inset(calc(' + tb.toFixed(2) + '% - ' + px.toFixed(2) + 'px) ' + lado.toFixed(2) + '% calc(' + tb.toFixed(2) + '% - ' + px.toFixed(2) + 'px) ' + lado.toFixed(2) + '%)');
    A.stage(lb >= 1 ? 'none' : 'translate3d(0,' + ((1 - lb) * 30).toFixed(2) + 'px,0) scale(' + (.96 + .04 * lb).toFixed(4) + ')');
    A.info(lb >= 1 ? 'none' : 'translate3d(0,' + ((1 - lb) * 20).toFixed(2) + 'px,0)');
    abierta = lb > .97;

    // los anillos: la primera vez que la ventana de Disco termina de abrirse
    if (!contados && abierta && A.anillos.length) { contados = true; cuenta = { t: 0, A: A }; }
    if (cuenta) {
      cuenta.t += dt;
      var fin = true;
      cuenta.A.anillos.forEach(function (d, i) {
        var k = sale(cl((cuenta.t - i * .12) / 1.1));
        if (k < 1) fin = false;
        d.ponB(String(Math.round(d.v * k)));
        d.ponArco((C * (1 - d.v * k / 100)).toFixed(2) + 'px');
      });
      if (fin) { cuenta.A.anillos.forEach(function (d) { d.li.classList.remove('is-contando'); }); cuenta = null; }
    }
  }

  medir();
  addEventListener('resize', medir);
  if (window.ResizeObserver) new ResizeObserver(posiciones).observe(document.body);
  if (document.fonts) document.fonts.ready.then(medir);
  if (!quieto) {
    if (window.gsap) gsap.ticker.add(vuelta); else (function f() { requestAnimationFrame(f); vuelta(); })();
    // las letras se montan en el primer momento libre tras la carga (o ya, si se llega con un ancla)
    var cuando = window.requestIdleCallback || function (fn) { return setTimeout(fn, 300); };
    if (location.hash) montar();
    else addEventListener('load', function () { cuando(montar, { timeout: 2500 }); }, { once: true });
    addEventListener('scroll', function () { montar(); }, { once: true, passive: true });
  }

  EV.paraQuien = { elegir: elegir, medir: medir, montar: montar };
})();
