/* ==========================================================================
   lateral.js — #lateral, "Construimos y diseñamos…" (desde backup-pre-lateral).
   El motor (pin, pista, suavizado, letras, ondulación, barra, cabecera) está
   en js/recorrido.js desde backup-pre-conquien-lateral. Aquí, lo suyo:
   1) Transición: una línea de 1 px cruza el centro de la pantalla y después
      se abre en gris (clip-path inset, ease-in-out); el titular sube 24 px.
   2) Cuándo se escribe cada bloque: el titular, con la apertura; los demás,
      según su posición en la pantalla.
   3) El final (desde backup-pre-para-quien-planes): tras la lista, la franja
      naranja fina (6vw, solo acento) y el último panel, "¿PARA QUIÉN?", con las
      mismas letras. Sin persiana: el gris sigue sin cortes en #para-quien. Al
      soltarse el panel, js/para-quien.js releva la pregunta (EV.lateralRelevo:
      dónde queda en pantalla y en qué scroll se suelta) y la encoge.
   · Movimiento reducido / versión fija: sin apertura (corte limpio).
   ========================================================================== */
(function () {
  var R = (window.EV || {}).recorrido, sec = document.getElementById('lateral');
  if (!R || !sec) return;
  var quieto = R.quieto, cl = R.util.cl, tramo = R.util.tramo, suaviza = R.util.suaviza, escritor = R.util.escritor;

  // tramos del scroll, en pantallas (0 = la sección llega arriba)
  var LINEA = [-.3, .1], ABRE = [.1, 1], TITULAR = [.55, 1.27], APERTURA = quieto ? 0 : 1.35;
  var COLA = .3;                                // tras el recorrido, quieta: el suavizado llega al final antes de soltarse (relevo exacto)

  var $ = function (s) { return sec.querySelector(s); };
  var win = $('.lat-window'), h2 = $('.lat-h'), parrafo = $('.lat-p'), pText = $('.p-text');
  var kick = $('.lat-kick'), lista = $('.lat-list'), pList = $('.p-list'), pQuien = $('.p-quien'), pregunta = $('.lat-q');

  var ponClip = escritor(win, 'clipPath'), ponTitular = escritor(h2, 'transform'), ponParrafo = escritor(parrafo, 'transform');
  var ponHint = escritor($('.lat-hint'), 'opacity');

  var pInicio = 0, retener = 0, veSe = null, actual = null;
  var rango = { p: [0, 1], kick: [0, 1], lista: [0, 1], q: [0, 1] };
  var relevo = { x: 0, y: 0, w: 0 };

  // para js/para-quien.js: dónde queda la pregunta al acabar el recorrido y en qué scroll se suelta el panel
  window.EV.lateralRelevo = function () {
    if (!actual) return null;
    return { el: pregunta, x: relevo.x, y: relevo.y, w: relevo.w, suelta: actual.top + actual.fin + actual.cola, alto: actual.h };
  };

  R.crear({
    sec: sec,
    sentido: -1,
    alCargar: true,
    bloques: [
      { el: h2, W: 7 },
      { el: parrafo, tipo: 'lineas', W: 1.3 },          // fundido suave por líneas (las franjas, solo en titular y lista)
      { el: kick, W: 6 },
      { el: lista, piezas: [].slice.call(lista.children), W: 6 },
      { el: pregunta, W: 7 }
    ],
    listas: [lista],
    amplitud: .5,                                        // la ondulación, a la mitad

    tramos: function (r) {
      actual = r;
      r.apertura = Math.round(r.h * APERTURA);
      r.despues = 0;
      r.cola = quieto ? 0 : Math.round(r.h * COLA);
      r.desde = quieto ? 0 : LINEA[0] * r.h;
    },
    recorrido: function (r) { return pQuien.offsetLeft + pQuien.offsetWidth - r.vw; },
    medir: function (r) {
      var vw = r.vw, g = parseFloat(getComputedStyle(pText).paddingLeft) || 0, pw = parrafo.offsetWidth;
      pInicio = pText.offsetLeft;
      retener = vw <= 860 ? Math.max(0, pText.offsetWidth - 2 * g - pw) : 0;
      // P de cada bloque: entre qué dos x de la pista se escribe, según dónde esté el bloque en la pantalla
      function entre(el, panel, desde, hasta) {
        var left = panel.offsetLeft + el.offsetLeft, a = Math.min(left, Math.max(0, left - desde));
        return [a, Math.max(a + 1, Math.min(r.run, left - hasta))];
      }
      rango.p = entre(parrafo, pText, Math.max(vw * .5, vw - pw * .62), g - retener);
      rango.kick = entre(kick, pList, vw * .9, vw * .64);
      rango.lista = entre(lista, pList, vw * .78, vw * .12);
      rango.q = entre(pregunta, pQuien, vw * .92, Math.max(vw * .2, g + 1));   // escrita del todo antes de llegar a su sitio
      // la pregunta al acabar la pista (x = run): la pista empieza en el borde izquierdo del panel fijo
      relevo.x = pQuien.offsetLeft + pregunta.offsetLeft - r.run;
      relevo.y = pQuien.offsetTop + pregunta.offsetTop;
      relevo.w = pregunta.offsetWidth;
    },

    dibujar: function (r) {
      var h = r.h, v = r.v, s = r.s, x = r.x, b = r.bloques;
      var baja = Math.max(0, -s);                 // cuánto le falta al panel para llegar arriba
      var arriba = 0;

      // 1) la línea y la apertura
      var cubre = s >= 0;                          // la ventana gris llena la pantalla (para js/red.js)
      if (quieto) ponClip('inset(0 0 0 0)');
      else {
        var linea = suaviza(tramo(v / h, LINEA[0], LINEA[1]));
        var abre = suaviza(tramo(v / h, ABRE[0], ABRE[1]));
        var c = Math.min(h - 1, Math.max(0, r.centro - baja));
        arriba = c * (1 - abre);
        ponClip(linea ? 'inset(' + arriba.toFixed(2) + 'px ' + ((1 - linea) * 100).toFixed(2) + '% ' + ((h - c - 1) * (1 - abre)).toFixed(2) + 'px 0)'
                      : 'inset(50% 100% 50% 0)');
        ponTitular('translate3d(0,' + (24 * (1 - abre)).toFixed(2) + 'px,0)');
        if (linea === 0) arriba = Infinity;
        cubre = linea >= 1 && abre >= 1 && baja <= 0;
      }
      window.EV.lateralCubre = cubre && s <= r.fin + r.cola;
      ponHint((1 - cl(r.p * 8)).toFixed(3));
      ponParrafo(retener ? 'translate3d(' + Math.min(retener, Math.max(0, x - pInicio)).toFixed(1) + 'px,0,0)' : 'none');

      // 2) las letras
      if (!quieto) {
        b[0].escribir(tramo(v / h, TITULAR[0], TITULAR[1]));
        b[1].escribir(tramo(x, rango.p[0], rango.p[1]));
        b[2].escribir(tramo(x, rango.kick[0], rango.kick[1]));
        b[3].escribir(tramo(x, rango.lista[0], rango.lista[1]));
        b[4].escribir(tramo(x, rango.q[0], rango.q[1]));
      }

      var ve = s > -h && s < r.fin && v < r.apertura + r.run / 8;
      if (ve !== veSe) { veSe = ve; sec.classList.toggle('se-ve', ve); }

      // 3) qué hay bajo la cabecera: el gris (abierto) o aún el negro; suelta, manda #para-quien (js/home.js)
      var medio = R.cabecera.medio, abajo = h + r.fin + r.cola - s;
      if (abajo <= medio) return null;
      if (s > r.fin + r.cola) return { clara: true };      // suelta y subiendo: aún es su gris lo que hay bajo el logo
      return { clara: baja + arriba < medio, lisa: s >= 0 };
    }
  });
})();
