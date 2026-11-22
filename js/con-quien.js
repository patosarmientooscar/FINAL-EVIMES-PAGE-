/* ==========================================================================
   con-quien.js — #con-quien, "Con quién trabajamos" (desde
   backup-pre-conquien-lateral): el espejo de #lateral sobre js/recorrido.js.
   1) Está detrás de la persiana de #lateral (se solapa con su final); mientras
      baja, el titular baja 24 px hasta su sitio y se escribe.
   2) La pista empieza pegada a la derecha y va hacia la derecha: el contenido
      entra por la izquierda. La P de cada bloque es cuánto ha entrado por ahí.
   3) El interruptor (radiogroup): los textos se borran en orden inverso (0,4 s)
      y se escriben los del otro caso, sin mover el scroll. Las dos opciones
      ocupan el mismo sitio en la pista (css/con-quien.css las apila): el
      recorrido mide lo mismo con una que con otra.
   · Se monta con EV.recorrido.despues (lejos del primer pintado). Hasta entonces
     está detrás de #lateral, que ya la tapa.
   · Movimiento reducido / versión fija: sin persiana, letras ni ondulación; el
     cambio de opción es un corte.
   ========================================================================== */
(function () {
  var EV = window.EV || {}, R = EV.recorrido, sec = document.getElementById('con-quien');
  if (!R || !sec || !sec.querySelector('.lat-pin')) return;
  R.despues(montar);
  function montar() {
  var quieto = R.quieto, cl = R.util.cl, tramo = R.util.tramo, suaviza = R.util.suaviza, escritor = R.util.escritor;

  // tramos del scroll, en pantallas (0 = la sección queda fija, aún tapada por el naranja)
  var PREVIA = .5, BAJA = 1;                    // la persiana de js/lateral.js, vista desde aquí
  var TITULAR = [.84, 1.54], APERTURA = quieto ? 0 : 1.75, COLA = .3;
  var BORRA = .4, ESCRIBE = .55;                // segundos del interruptor

  var $ = function (s) { return sec.querySelector(s); };
  var $$ = function (s, c) { return [].slice.call((c || sec).querySelectorAll(s)); };
  var track = $('.lat-track'), pText = $('.p-text'), band = $('.p-band'), mando = $('.cq-mando');
  var radios = $$('[role="radio"]', mando);
  var ponVentana = escritor($('.lat-window'), 'opacity');

  /* ---------- las dos opciones ---------- */
  var bloques = [];
  var opciones = [0, 1].map(function (i) {
    var en = function (s) { return $('.cq-op[data-op="' + i + '"] ' + s); };
    var O = { nodos: $$('.cq-op[data-op="' + i + '"]'), h: en('.lat-h'), p: en('.lat-p'), lista: en('.lat-list'), pasos: en('.cq-pasos'), cierre: en('.cq-fin'), boton: en('.cq-boton-caja') };
    O.primero = bloques.length;
    bloques.push(
      { el: O.h, W: 7 },
      { el: O.p, W: 16 },
      { el: O.lista, piezas: $$('li', O.lista), W: 6 },
      { el: O.pasos, piezas: $$('li', O.pasos), W: 6 },
      { el: O.cierre, W: 7 }
    );
    O.ponH = escritor(O.h, 'transform');
    O.ponP = escritor(O.p, 'transform');
    O.ponBoton = escritor(O.boton, 'opacity');
    O.ponBotonY = escritor(O.boton, 'transform');
    O.rango = null;
    O.largas = [];
    if (quieto) porPalabras(O.h);
    return O;
  });

  // sin letras partidas (movimiento reducido), cada palabra del titular sigue necesitando su caja
  function porPalabras(el) {
    var fr = document.createDocumentFragment();
    [].forEach.call(el.childNodes, function (n) {
      if (n.nodeName === 'BR') { fr.appendChild(document.createElement('br')); return; }
      n.textContent.split(/([ \t\n\r]+)/).forEach(function (t) {
        if (!t) return;
        if (/^[ \t\n\r]+$/.test(t)) { fr.appendChild(document.createTextNode(' ')); return; }
        var w = document.createElement('span');
        w.className = 'cq-palabra';
        w.textContent = t;
        fr.appendChild(w);
      });
    });
    el.textContent = '';
    el.appendChild(fr);
  }
  // palabras más anchas que la pantalla ("CONSTRUIMOS." en un móvil): qué letras son y cuánto les sobra
  function largasDe(O) {
    var antes = O.largas, i0 = 0, vistas = [];
    $$('.sw', O.h).forEach(function (w) {
      var ls = w.querySelectorAll('.sc'), n = ls.length;
      if (!n) return;
      var sangria = parseFloat(getComputedStyle(ls[0]).paddingLeft) || 0;
      var ancho = ls[n - 1].getBoundingClientRect().right - ls[0].getBoundingClientRect().left - 2 * sangria;
      var cabe = w.getBoundingClientRect().width, sobra = ancho - cabe;
      if (sobra > 1) vistas.push({ el: w, desde: i0, n: n, caben: Math.floor(n * cabe / ancho), sobra: sobra, pon: escritor(w, 'transform') });
      i0 += n;
    });
    antes.forEach(function (w) { w.el.style.transform = ''; });
    O.largas = vistas;
    O.letrasH = i0;
  }

  var op = 0, pedida = 0, k = 1, previa = 0;

  function mostrar(i) {
    op = i;
    opciones.forEach(function (O, j) { O.nodos.forEach(function (n) { n.hidden = j !== i; }); });
  }

  var rec = R.crear({
    sec: sec,
    sentido: 1,
    bloques: bloques,
    listas: opciones.map(function (O) { return O.lista; }),

    tramos: function (r) {
      var antes = R.de('lateral'), solapa = antes && antes.solape;
      previa = solapa ? Math.round(r.h * PREVIA) : 0;
      sec.style.marginTop = solapa ? -(antes.solape + previa) + 'px' : '';
      r.apertura = Math.round(r.h * APERTURA);
      r.despues = 0;
      r.cola = Math.round(r.h * COLA);          // un respiro con el cierre entero antes de soltarse
      r.desde = quieto ? 0 : -1;
    },
    recorrido: function (r) { return track.offsetWidth - r.vw; },
    medir: function (r) {
      var vw = r.vw, estrecha = vw <= 860, inicio = track.offsetLeft;
      var g = parseFloat(getComputedStyle(pText).paddingLeft) || 0;
      opciones.forEach(function (O) {
        // x de la pista en la que el borde izquierdo del bloque está en "en"
        function entre(el, desde, hasta) {
          var left = inicio + el.closest('.lat-panel').offsetLeft + el.offsetLeft;
          var a = Math.max(0, Math.min(r.run - 1, desde - left));
          return [a, Math.max(a + 1, Math.min(r.run, hasta - left))];
        }
        if (!quieto) largasDe(O);
        var pw = O.p.offsetWidth, pLeft = inicio + pText.offsetLeft + O.p.offsetLeft;
        O.retener = estrecha ? Math.max(0, pText.offsetWidth - 2 * g - pw) : 0;
        O.retenerDesde = vw - g - pw - pLeft;                                  // ya entró entero
        var fuera = estrecha ? .6 : .3;                                        // cuánto del bloque sigue fuera al empezar a escribirse
        var dentro = function (el) { return vw - g - el.offsetWidth; };        // y al acabar: entero en pantalla
        O.rango = {
          p: entre(O.p, -pw * fuera, dentro(O.p) + O.retener),
          lista: entre(O.lista, -O.lista.offsetWidth * fuera, dentro(O.lista) - (estrecha ? 0 : vw * .06)),
          pasos: entre(O.pasos, -O.pasos.offsetWidth * fuera, dentro(O.pasos)),
          cierre: entre(O.cierre, -O.cierre.offsetWidth * fuera, dentro(O.cierre))
        };
      });
      var cab = document.querySelector('.cabecera');
      if (cab) cab.style.setProperty('--franja-izq', band.offsetWidth + 'px');
    },

    animar: function (r, dt) {
      if (pedida === op && k === 1) return false;
      if (pedida !== op) {
        k = Math.max(0, k - dt / BORRA);
        if (k === 0) {
          mostrar(pedida);
          r.bloques.slice(opciones[op].primero, opciones[op].primero + 5).forEach(function (b) { b.ordenar(); });
        }
      } else k = Math.min(1, k + dt / ESCRIBE);
      return true;
    },

    dibujar: function (r) {
      var h = r.h, v = r.v - previa, x = r.x;
      var baja = quieto ? 0 : 24 * (1 - suaviza(tramo(v / h, 0, BAJA)));
      // tapada hasta que el naranja llena la pantalla
      ponVentana(quieto || r.v >= 0 ? '1' : '0');

      opciones.forEach(function (O, i) {
        var P = O.rango;
        O.ponH(baja ? 'translate3d(0,' + (-baja).toFixed(2) + 'px,0)' : 'none');
        O.ponP(O.retener ? 'translate3d(' + (-Math.min(O.retener, Math.max(0, x - O.retenerDesde))).toFixed(1) + 'px,0,0)' : 'none');
        if (quieto) return;
        // la opción que no está, a 0. Al borrar, la P de cada bloque vuelve a 0: en orden inverso
        var m = i === op ? k : 0, b = r.bloques, n = O.primero;
        var tit = m * tramo(r.v / h, TITULAR[0], TITULAR[1]);
        b[n].escribir(tit);
        // la palabra larga empieza con su primera letra en pantalla y corre al escribirse, como una máquina de escribir
        O.largas.forEach(function (w) {
          var ya = tit * (O.letrasH + 7) - w.desde;
          w.pon('translate3d(' + (w.sobra * (1 - tramo(ya, w.caben, w.n + 1))).toFixed(1) + 'px,0,0)');
        });
        b[n + 1].escribir(m * tramo(x, P.p[0], P.p[1]));
        b[n + 2].escribir(m * tramo(x, P.lista[0], P.lista[1]));
        b[n + 3].escribir(m * tramo(x, P.pasos[0], P.pasos[1]));
        var fin = m * tramo(x, P.cierre[0], P.cierre[1]), bt = cl((fin - .7) / .3);
        b[n + 4].escribir(fin);
        O.ponBoton(bt.toFixed(3));
        O.ponBotonY(bt < 1 ? 'translate3d(0,' + (12 * (1 - bt)).toFixed(1) + 'px,0)' : 'none');
      });

      var s = r.s, medio = R.cabecera.medio, finFijo = r.fin + r.cola;
      if (-s >= medio || r.largo - s <= medio) return null;
      return {
        clara: quieto || r.v >= 0,
        lisa: s >= 0 && s <= finFijo,
        franja: s > finFijo ? 'izq' : null
      };
    }
  });

  /* ---------- el interruptor ---------- */
  function elegir(i) {
    radios.forEach(function (b, j) { b.setAttribute('aria-checked', String(j === i)); b.tabIndex = j === i ? 0 : -1; });
    mando.dataset.v = i;
    pedida = i;
    rec.preparar();
    if (quieto) { k = 1; mostrar(i); }
    rec.sucio = true;
  }
  radios.forEach(function (b, i) { b.addEventListener('click', function () { elegir(i); }); });
  mando.addEventListener('keydown', function (e) {
    var paso = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[e.key];
    if (!paso) return;
    e.preventDefault();
    var n = (pedida + paso + radios.length) % radios.length;
    elegir(n);
    radios[n].focus({ preventScroll: true });
  });

  /* ---------- el teclado ----------
     Lo que recibe el foco tiene que verse: el interruptor puede estar aún tapado por el naranja y el botón,
     en la pista, fuera de la pantalla. Con el ratón no se mueve nada. */
  var porTecla = false;
  document.addEventListener('keydown', function (e) { if (e.key === 'Tab') porTecla = true; }, true);
  document.addEventListener('pointerdown', function () { porTecla = false; }, true);
  sec.addEventListener('focusin', function (e) {
    if (!porTecla) return;
    rec.preparar();
    var boton = e.target.closest('.cq-boton'), enMando = mando.contains(e.target);
    if (!boton && !enMando) return;
    rec.medirArriba();
    var s = R.util.scrollY() - rec.top, abierta = rec.apertura, fin = rec.fin;
    var bien = boton ? (s >= fin - 4 && s <= fin + rec.cola) : (s >= abierta - 4 && s <= fin + rec.cola);
    if (bien) return;
    var destino = rec.top + (boton ? fin : abierta);
    requestAnimationFrame(function () { R.util.irA(destino); });
  });
  }
})();
