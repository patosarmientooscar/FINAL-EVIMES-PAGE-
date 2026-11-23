/* ==========================================================================
   lateral.js — #lateral, "Construimos y diseñamos…" (desde backup-pre-lateral).
   El motor (pin, pista, suavizado, letras, ondulación, barra, cabecera) está
   en js/recorrido.js desde backup-pre-conquien-lateral. Aquí, lo suyo:
   1) Transición: una línea de 1 px cruza el centro de la pantalla y después
      se abre en gris (clip-path inset, ease-in-out); el titular sube 24 px.
   2) Cuándo se escribe cada bloque: el titular, con la apertura; los demás,
      según su posición en la pantalla.
   3) La salida: la franja naranja se ensancha hasta llenar la pantalla y baja
      como una persiana. Descubre la sección que lleva [data-tras-persiana]
      (#para-quien), que se solapa con el final de esta (margin-top: −r.solape) y
      mientras baja el naranja se queda quieta en su sitio (un translateY que
      compensa el scroll, solo durante la persiana). Después scrollea normal.
   · Movimiento reducido / versión fija: sin apertura ni persiana (corte
     limpio: una sección detrás de otra).
   ========================================================================== */
(function () {
  var R = (window.EV || {}).recorrido, sec = document.getElementById('lateral');
  if (!R || !sec) return;
  var quieto = R.quieto, cl = R.util.cl, tramo = R.util.tramo, suaviza = R.util.suaviza, escritor = R.util.escritor;

  // tramos del scroll, en pantallas (0 = la sección llega arriba)
  var LINEA = [-.3, .1], ABRE = [.1, 1], TITULAR = [.55, 1.27], APERTURA = quieto ? 0 : 1.35;
  var ENSANCHA = .7, PERSIANA = 1, COLA = .5;   // tras el recorrido. COLA: por si el scroll va por delante del suavizado

  var $ = function (s) { return sec.querySelector(s); };
  var win = $('.lat-window'), band = $('.p-band'), h2 = $('.lat-h'), parrafo = $('.lat-p'), pText = $('.p-text');
  var kick = $('.lat-kick'), lista = $('.lat-list'), pList = $('.p-list'), cortina = $('.lat-cortina');
  var tras = document.querySelector('[data-tras-persiana]');
  var sale = !quieto && !!cortina && !!tras;
  var ponTras = tras && escritor(tras, 'transform');

  var ponClip = escritor(win, 'clipPath'), ponTitular = escritor(h2, 'transform'), ponParrafo = escritor(parrafo, 'transform');
  var ponHint = escritor($('.lat-hint'), 'opacity'), ponUI = escritor($('.lat-ui'), 'opacity');
  var ponCortina = cortina && {
    ve: escritor(cortina, 'opacity'),
    baja: escritor(cortina, 'transform'),
    ancho: escritor(cortina.querySelector('i'), 'transform'),
    texto: escritor(cortina.querySelector('b'), 'transform')
  };

  var banda = 0, pInicio = 0, retener = 0, ensancha = 0, persiana = 0, empuje = 0, veSe = null, seBaja = null;
  var rango = { p: [0, 1], kick: [0, 1], lista: [0, 1] };

  R.crear({
    sec: sec,
    tras: tras && tras.id,                                 // su ancla la abre ya descubierta (EV.recorrido.destino)
    sentido: -1,
    alCargar: true,
    bloques: [
      { el: h2, W: 7 },
      { el: parrafo, tipo: 'lineas', W: 1.3 },          // fundido suave por líneas (las franjas, solo en titular y lista)
      { el: kick, W: 6 },
      { el: lista, piezas: [].slice.call(lista.children), W: 6 }
    ],
    listas: [lista],
    amplitud: .5,                                        // la ondulación, a la mitad

    tramos: function (r) {
      ensancha = sale ? Math.round(r.h * ENSANCHA) : 0;
      persiana = sale ? Math.round(r.h * PERSIANA) : 0;
      r.apertura = Math.round(r.h * APERTURA);
      r.despues = ensancha + persiana;
      r.cola = sale ? Math.round(r.h * COLA) : 0;
      r.desde = quieto ? 0 : LINEA[0] * r.h;
      r.solape = sale ? r.h + r.cola : 0;                  // lo que sube la sección de detrás: su borde de arriba, donde acaba la persiana
      if (tras) tras.style.marginTop = sale ? -r.solape + 'px' : '';
    },
    recorrido: function (r) { return band.offsetLeft + band.offsetWidth - r.vw; },
    medir: function (r) {
      var vw = r.vw, g = parseFloat(getComputedStyle(pText).paddingLeft) || 0, pw = parrafo.offsetWidth;
      banda = band.offsetWidth;
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
      var cab = document.querySelector('.cabecera');
      if (cab) cab.style.setProperty('--franja', banda + 'px');
    },
    empuje: function () { return empuje; },

    dibujar: function (r) {
      var h = r.h, v = r.v, s = r.s, x = r.x, b = r.bloques;
      var baja = Math.max(0, -s);                 // cuánto le falta al panel para llegar arriba
      var arriba = 0, e1 = 0, e2 = 0;

      // 1) la línea y la apertura
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
      }
      ponHint((1 - cl(r.p * 8)).toFixed(3));
      ponParrafo(retener ? 'translate3d(' + Math.min(retener, Math.max(0, x - pInicio)).toFixed(1) + 'px,0,0)' : 'none');

      // 2) las letras
      if (!quieto) {
        b[0].escribir(tramo(v / h, TITULAR[0], TITULAR[1]));
        b[1].escribir(tramo(x, rango.p[0], rango.p[1]));
        b[2].escribir(tramo(x, rango.kick[0], rango.kick[1]));
        b[3].escribir(tramo(x, rango.lista[0], rango.lista[1]));
      }

      // 3) la salida: la franja se ensancha empujando la pista y, llena la pantalla, baja
      if (sale) {
        var t0 = r.apertura + r.run;
        e1 = suaviza(tramo(v, t0, t0 + ensancha));
        e2 = suaviza(tramo(v, t0 + ensancha, t0 + ensancha + persiana));
        empuje = (r.vw - banda) * e1;
        ponCortina.ve(e1 > 0 && e2 < 1 ? '1' : '0');
        ponCortina.baja('translate3d(0,' + (e2 * h).toFixed(1) + 'px,0)');
        // la escala del degradado es la de la franja: en e1 = 0 son los mismos píxeles
        ponCortina.ancho('scaleX(' + ((banda + empuje) / r.vw).toFixed(5) + ')');
        ponCortina.texto('translate3d(' + ((r.vw - banda) / 2 * (1 - e1)).toFixed(1) + 'px,0,0)');
        ponUI((1 - cl(e1 * 4)).toFixed(3));
        var b2 = e2 > 0;
        if (b2 !== seBaja) { seBaja = b2; sec.classList.toggle('se-baja', b2); }
        // la sección de detrás, quieta mientras baja el naranja (con el scroll real: no se mueve ni un píxel)
        var t = tramo(s, t0 + ensancha, t0 + ensancha + persiana);
        ponTras(t > 0 && t < 1 ? 'translate3d(0,' + (-(1 - t) * h).toFixed(1) + 'px,0)' : '');
      }

      var ve = s > -h && s < r.fin && v < r.apertura + r.run / 8;
      if (ve !== veSe) { veSe = ve; sec.classList.toggle('se-ve', ve); }

      // 4) qué hay bajo la cabecera
      var medio = R.cabecera.medio, abajo = h + r.fin + r.cola - s;
      if (abajo <= medio) return null;
      // bajo el logo, o el naranja o ya el gris de la sección de detrás
      if (e2 > 0) return e2 * h > medio ? { clara: true, lisa: true } : { clara: false, naranja: true, lisa: true };
      var naranja = e1 > 0 && r.vw - banda - empuje < R.cabecera.marcaX;
      return {
        clara: !naranja && baja + arriba < medio,
        naranja: naranja,
        lisa: s >= 0 && (sale || s <= r.fin),
        franja: !sale && s > r.fin ? 'der' : null
      };
    }
  });
})();
