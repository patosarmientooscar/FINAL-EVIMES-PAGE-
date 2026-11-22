/* ==========================================================================
   lateral.js — la sección lateral de la home (desde backup-pre-lateral).
   Portado de Downloads/evimes-lateral/js/lateral.js (el efecto de las tres
   franjas, la ondulación y el suavizado), con lo que pide el brief:
   1) Transición: una línea de 1 px cruza el centro de la pantalla y después
      se abre en gris (clip-path inset, ease-in-out); el titular sube 24 px.
   2) Recorrido: alto = pantalla + apertura + recorrido; el scroll de Lenis
      mueve la pista, suavizado (1 − e^(−9·dt)).
   3) Letras en orden de lectura al ritmo del scroll: cada bloque tiene su P y
      la letra i avanza clamp((P·(N+W) − i)/W). Al volver, se deshacen.
   4) La lista ondula con el recorrido (un muelle por línea).
   · Un callback en gsap.ticker. Posiciones cacheadas: ninguna lectura de
     layout por fotograma. No calcula fuera de pantalla ni con la pestaña oculta.
   · Movimiento reducido / versión fija: sin apertura, letras ni ondulación;
     el recorrido sigue al scroll sin suavizado.
   ========================================================================== */
(function () {
  var sec = document.getElementById('lateral');
  if (!sec) return;
  var EV = (window.EV = window.EV || {});
  var quieto = EV.mode !== 'cine';

  // tramos del scroll, en pantallas (0 = la sección llega arriba)
  var LINEA = [-.3, .1], ABRE = [.1, 1], TITULAR = [.55, 1.27], APERTURA = quieto ? 0 : 1.35;
  var SUAVE = 9;                                // el lerp del prototipo
  var K = 300, C = 22 * 1.2, H = 1 / 120;       // el muelle de la lista

  var $ = function (s) { return sec.querySelector(s); };
  var pin = $('.lat-pin'), win = $('.lat-window'), track = $('.lat-track'), band = $('.p-band');
  var h2 = $('.lat-h'), parrafo = $('.lat-p'), pText = $('.p-text'), kick = $('.lat-kick');
  var lista = $('.lat-list'), pList = $('.p-list'), hint = $('.lat-hint'), bar = $('.lat-bar i'), count = $('.lat-count b');
  var cab = document.querySelector('.cabecera');
  var items = [].slice.call(lista.children);
  var fases = items.map(function (li, i) { return (35 * i - 180) * Math.PI / 180; });
  var wx = items.map(function () { return 0; }), wv = wx.slice();

  function cl(v) { return v < 0 ? 0 : v > 1 ? 1 : v; }
  function tramo(v, a, b) { return cl((v - a) / (b - a)); }
  function suaviza(t) { return t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; }   // ease-in-out
  function scrollY() { var l = EV.home && EV.home.lenis; return l ? l.scroll : window.scrollY; }

  // escribe un estilo solo si cambia
  function escritor(el, prop) {
    var ultimo;
    return function (v) { if (v !== ultimo) { ultimo = v; el.style[prop] = v; } };
  }
  var ponClip = escritor(win, 'clipPath'), ponPista = escritor(track, 'transform'), ponTitular = escritor(h2, 'transform');
  var ponParrafo = escritor(parrafo, 'transform'), ponBarra = escritor(bar, 'transform'), ponHint = escritor(hint, 'opacity');
  var ponItem = items.map(function (li) { return escritor(li, 'transform'); });

  /* ---------- las letras ---------- */
  var bloques = [
    { el: h2, piezas: [h2], W: 7 },
    { el: parrafo, piezas: [parrafo], W: 16 },
    { el: kick, piezas: [kick], W: 6 },
    { el: lista, piezas: items, W: 6 }
  ];
  bloques.forEach(function (b) { b.letras = []; b.orden = []; b.P = -1; b.hecho = quieto; });

  var molde = document.createElement('span');
  molde.className = 'sc';
  ['m', 's s1', 's s2', 's s3'].forEach(function (c) { var s = document.createElement('span'); s.className = c; molde.appendChild(s); });

  // En dos pasos, para que ninguna tarea sea larga: primero las palabras y luego sus letras, a trozos.
  function empezar(b) {
    var textos = b.piezas.map(function (el) { return el.textContent.replace(/\s+/g, ' ').trim(); });
    b.el.setAttribute('aria-label', textos.join(', '));
    b.palabras = [];
    b.piezas.forEach(function (el, fila) {
      var fr = document.createDocumentFragment();
      // aria-label no se anuncia en <p>, <span> ni <li>: el texto entero queda también para el lector
      var sr = document.createElement('span');
      sr.className = 'sr-only';
      sr.textContent = textos[fila];
      fr.appendChild(sr);
      [].forEach.call(el.childNodes, function (nodo) {
        if (nodo.nodeName === 'BR') { fr.appendChild(document.createElement('br')); return; }
        nodo.textContent.split(/(\s+)/).forEach(function (palabra) {
          if (!palabra) return;
          if (/^\s+$/.test(palabra)) { fr.appendChild(document.createTextNode(' ')); return; }
          var w = document.createElement('span');
          w.className = 'sw';
          w.setAttribute('aria-hidden', 'true');
          w.textContent = palabra;
          b.palabras.push({ w: w, texto: palabra, fila: fila });
          fr.appendChild(w);
        });
      });
      el.textContent = '';
      el.appendChild(fr);
    });
  }
  function montar(b, cuantas) {
    var n = 0;
    while (n < cuantas && b.palabras.length) {
      var p = b.palabras.shift();
      p.w.textContent = '';
      Array.from(p.texto).forEach(function (ch) {
        var c = molde.cloneNode(true), k = c.children;
        for (var i = 0; i < 4; i++) k[i].textContent = ch;
        p.w.appendChild(c);
        b.letras.push({ c: c, m: k[0], s1: k[1], s2: k[2], s3: k[3], fila: p.fila, q: 0, cruza: false, seVe: false });
        n++;
      });
    }
    if (b.palabras.length) return;
    b.hecho = true;
    b.orden = b.letras.slice();
    b.P = -1;
  }
  function partir(b) {
    if (!b.palabras) empezar(b);
    montar(b, Infinity);
  }

  // línea a línea (de arriba abajo) y, en cada línea, de izquierda a derecha
  function ordenar(b) {
    if (!b.letras.length) return;
    b.letras.forEach(function (l) { var r = l.c.getBoundingClientRect(); l.x = r.left; l.y = r.top; l.h = r.height; });
    var porAlto = b.letras.slice().sort(function (a, z) { return a.fila - z.fila || a.y - z.y; });
    var linea = -1, ant = null;
    porAlto.forEach(function (l) {
      if (!ant || l.fila !== ant.fila || l.y - ant.y > l.h * .4) { linea++; ant = l; }
      l.linea = linea;
    });
    b.orden = porAlto.sort(function (a, z) { return a.linea - z.linea || a.x - z.x; });
    b.P = -1;
  }

  function pintar(l, q) {
    if (q === l.q || (q > 0 && q < 1 && Math.abs(q - l.q) < .004)) return;
    l.q = q;
    var a = cl((q - .3) / .55), sm = a * a * (3 - 2 * a);
    l.m.style.opacity = sm.toFixed(3);
    l.m.style.filter = sm > 0 && sm < 1 ? 'blur(' + ((1 - sm) * 8).toFixed(1) + 'px)' : '';
    var seVe = sm > 0, cruza = q > 0 && q < 1;
    if (seVe !== l.seVe) { l.seVe = seVe; l.m.style.visibility = seVe ? 'visible' : ''; }
    if (cruza !== l.cruza) { l.cruza = cruza; l.s1.style.visibility = l.s2.style.visibility = l.s3.style.visibility = cruza ? 'visible' : ''; }
    if (!cruza) return;                         // las franjas solo se escriben mientras cruzan
    franja(l.s1, cl(q / .6), 1);
    franja(l.s2, cl((q - .1) / .6), -1);
    franja(l.s3, cl((q - .2) / .6), 1);
  }
  function franja(s, k, dir) {
    s.style.transform = 'translateX(' + (dir * (200 * k - 100)).toFixed(1) + '%)';
    s.style.opacity = Math.sin(Math.PI * k).toFixed(3);
  }
  function escribir(b, P) {
    if (P === b.P) return;
    b.P = P;
    var N = b.orden.length, v = P * (N + b.W);
    for (var i = 0; i < N; i++) pintar(b.orden[i], cl((v - i) / b.W));
  }

  /* ---------- medidas ---------- */
  var vw = 0, h = 0, alto = 0, centro = 0, pInicio = 0, top0 = 0, apertura = 0, run = 0, fin = 0, retener = 0, amp = 0;
  var cabMedio = 32, ultimoW = 0, ultimoH = 0;
  var rango = { p: [1, 0], kick: [1, 0], lista: [1, 0] };
  var actual = null, ultimaY = null, sucio = true;

  function medirArriba() {
    var y = 0, n = sec;
    while (n) { y += n.offsetTop; n = n.offsetParent; }
    if (y !== top0) { top0 = y; sucio = true; }
  }
  function medir() {
    vw = document.documentElement.clientWidth;
    h = pin.offsetHeight;
    alto = window.innerHeight;
    centro = Math.round(alto / 2);
    pInicio = pText.offsetLeft;
    ultimoW = vw; ultimoH = h;
    apertura = Math.round(h * APERTURA);
    run = Math.max(0, band.offsetLeft + band.offsetWidth - vw);
    fin = apertura + run;
    var g = parseFloat(getComputedStyle(pText).paddingLeft) || 0;
    var pw = parrafo.offsetWidth, estrecha = vw <= 860;
    retener = estrecha ? Math.max(0, pText.offsetWidth - 2 * g - pw) : 0;
    amp = Math.min(vw * .11, 150);

    // P de cada bloque: entre qué dos x de la pista se escribe, según dónde esté el bloque en la pantalla
    function entre(el, panel, desde, hasta) {
      var left = panel.offsetLeft + el.offsetLeft, a = Math.min(left, Math.max(0, left - desde));
      return [a, Math.max(a + 1, Math.min(run, left - hasta))];
    }
    rango.p = entre(parrafo, pText, Math.max(vw * .5, vw - pw * .62), g - retener);
    rango.kick = entre(kick, pList, vw * .9, vw * .64);
    rango.lista = entre(lista, pList, vw * .78, vw * .12);

    bloques.forEach(ordenar);
    if (cab) {
      var r = cab.getBoundingClientRect();
      cabMedio = r.top + r.height / 2;
      cab.style.setProperty('--franja', band.offsetWidth + 'px');
    }
    var altoSec = (h + fin) + 'px';
    if (sec.style.height !== altoSec) {
      sec.style.height = altoSec;
      // Lenis tarda 250 ms en enterarse: sin esto un salto a un ancla de más abajo se queda corto
      if (EV.home && EV.home.lenis) EV.home.lenis.resize();
    }
    medirArriba();
    sucio = true;
  }
  function alCambiar() {
    // la barra del móvil solo mueve el centro de la pantalla: no hace falta volver a medir las letras
    if (document.documentElement.clientWidth === ultimoW && pin.offsetHeight === ultimoH) { alto = window.innerHeight; centro = Math.round(alto / 2); sucio = true; }
    else medir();
  }

  function preparar() {
    var falta = bloques.filter(function (b) { return !b.hecho; });
    if (!falta.length) return;
    falta.forEach(partir);
    medir();
  }

  /* ---------- la cabecera ---------- */
  var clara = null, lisa = null, conFranja = null;
  function cabecera(c, l, f) {
    if (!cab) return;
    if (l !== lisa) { lisa = l; cab.classList.toggle('is-lisa', l); }
    if (f !== conFranja) { conFranja = f; cab.classList.toggle('is-franja', f); }
    if (c !== clara) {
      clara = c;
      EV.cabeceraClara = c;
      if (EV.home && EV.home.refrescar) EV.home.refrescar();
    }
  }

  /* ---------- el dibujo: todo sale del scroll suavizado (v) y del real (s, donde está el panel) ---------- */
  // cada cifra es una columna 0–9 que se mueve con transform
  count.textContent = '';
  var cifras = [0, 1, 2].map(function () {
    var caja = document.createElement('span'), col = document.createElement('span');
    caja.className = 'lat-cifra';
    col.textContent = '0\n1\n2\n3\n4\n5\n6\n7\n8\n9';
    caja.appendChild(col); count.appendChild(caja);
    return { mueve: escritor(col, 'transform'), ve: escritor(caja, 'opacity') };
  });
  var veSe = null, objetivo = items.map(function () { return 0; });
  function dibujar(v, s) {
    var baja = Math.max(0, -s);                 // cuánto le falta al panel para llegar arriba
    var arriba = 0;

    // 1) la línea y la apertura
    if (quieto) ponClip('inset(0 0 0 0)');
    else {
      var linea = suaviza(tramo(v / h, LINEA[0], LINEA[1]));
      var abre = suaviza(tramo(v / h, ABRE[0], ABRE[1]));
      var c = Math.min(h - 1, Math.max(0, centro - baja));
      arriba = c * (1 - abre);
      ponClip(linea ? 'inset(' + arriba.toFixed(2) + 'px ' + ((1 - linea) * 100).toFixed(2) + '% ' + ((h - c - 1) * (1 - abre)).toFixed(2) + 'px 0)'
                    : 'inset(50% 100% 50% 0)');
      ponTitular('translate3d(0,' + (24 * (1 - abre)).toFixed(2) + 'px,0)');
      if (linea === 0) arriba = Infinity;
    }

    // 2) el recorrido
    var x = Math.min(run, Math.max(0, v - apertura)), p = run ? x / run : 0;
    ponPista('translate3d(' + (-x).toFixed(1) + 'px,0,0)');
    ponBarra('scaleX(' + p.toFixed(4) + ')');
    ponHint((1 - cl(p * 8)).toFixed(3));
    if (retener) ponParrafo('translate3d(' + Math.min(retener, Math.max(0, x - pInicio)).toFixed(1) + 'px,0,0)');
    else ponParrafo('none');
    var n = Math.round(p * 100);
    for (var k = 0; k < 3; k++) cifras[k].mueve('translateY(' + -18 * (Math.floor(n / [100, 10, 1][k]) % 10) + 'px)');
    cifras[0].ve(n === 100 ? '1' : '0');

    // 3) las letras
    if (!quieto) {
      escribir(bloques[0], tramo(v / h, TITULAR[0], TITULAR[1]));
      escribir(bloques[1], tramo(x, rango.p[0], rango.p[1]));
      escribir(bloques[2], tramo(x, rango.kick[0], rango.kick[1]));
      escribir(bloques[3], tramo(x, rango.lista[0], rango.lista[1]));
    }

    // 4) a dónde tira la ondulación
    for (var i = 0; i < items.length; i++) objetivo[i] = quieto ? 0 : Math.cos(p * 6.2 + fases[i]) * amp;

    var ve = s > -h && s < fin && v < apertura + run / 8;
    if (ve !== veSe) { veSe = ve; sec.classList.toggle('se-ve', ve); }
    var abajo = h + fin - s;                    // el borde de abajo de la sección en la pantalla
    cabecera(baja + arriba < cabMedio && abajo > cabMedio, s >= 0 && s <= fin, s > fin && abajo > 0);
  }

  function ondular(dt, deGolpe) {
    var mueve = false, pasos = Math.max(1, Math.ceil(dt / H)), dd = dt / pasos;
    for (var i = 0; i < items.length; i++) {
      var d = objetivo[i] - wx[i];
      if (deGolpe || (Math.abs(d) < .05 && Math.abs(wv[i]) < .1)) { wx[i] = objetivo[i]; wv[i] = 0; }
      else {
        for (var j = 0; j < pasos; j++) { wv[i] += (K * (objetivo[i] - wx[i]) - C * wv[i]) * dd; wx[i] += wv[i] * dd; }
        mueve = true;
      }
      ponItem[i](quieto ? 'none' : 'translate3d(' + wx[i].toFixed(1) + 'px,0,0)');
    }
    return mueve;
  }

  /* ---------- el bucle ---------- */
  var dentro = null, ondulando = false;
  function fotograma(tiempo, dms) {
    if (document.hidden) return;
    var y = scrollY(), s = y - top0;
    var enPantalla = s > 1 - alto && s < h + fin;
    if (!enPantalla && dentro === false && !sucio) return;     // fuera de pantalla no se calcula nada
    var entra = enPantalla && !dentro, sale = !enPantalla;
    if (entra) preparar();
    if (enPantalla !== dentro) sec.classList.toggle('en-pantalla', enPantalla);
    dentro = enPantalla;

    var meta = Math.min(fin, Math.max(quieto ? 0 : LINEA[0] * h, s));
    var dt = Math.min(.05, (dms || 16.7) / 1000);
    var deGolpe = quieto || sale || actual === null;
    if (!sucio && y === ultimaY && actual === meta && !ondulando) return;

    if (deGolpe || Math.abs(meta - actual) < .1) actual = meta;
    else actual += (meta - actual) * (1 - Math.exp(-dt * SUAVE));
    ultimaY = y;
    sucio = false;
    dibujar(actual, s);
    ondulando = ondular(dt, deGolpe || entra);
  }

  /* ---------- arranque ---------- */
  sec.classList.add('is-viva');
  medir();
  fotograma();

  addEventListener('resize', alCambiar);
  if (window.ResizeObserver) new ResizeObserver(medirArriba).observe(document.body);
  if (document.fonts) {
    document.fonts.ready.then(function () { medir(); });
    if (document.fonts.addEventListener) document.fonts.addEventListener('loadingdone', function () { medir(); });
  }
  if (window.gsap) gsap.ticker.add(fotograma);
  else (function bucle() { requestAnimationFrame(bucle); fotograma(); })();

  // Las 367 letras se montan en los momentos libres tras la carga, unas 24 cada vez (de una sola vez era una
  // tarea de ~100 ms). Si el usuario llega antes (o salta a un ancla), preparar() termina lo que falte.
  function enReposo() {
    var turno = window.requestIdleCallback || function (fn) { return setTimeout(fn, 60); };
    turno(function () {
      var falta = bloques.filter(function (b) { return !b.hecho; }), b = falta[0];
      if (!b) return;                           // ya lo hizo preparar()
      if (b.palabras) montar(b, 24); else empezar(b);
      if (b.hecho && falta.length === 1) medir(); else enReposo();
    }, { timeout: 3000 });
  }
  if (location.hash) preparar();
  else if (document.readyState === 'complete') enReposo();
  else addEventListener('load', enReposo, { once: true });

  EV.lateral = {
    preparar: preparar,
    // a dónde lleva #lateral: el gris abierto y el titular escrito
    destino: function () { medirArriba(); return top0 + apertura; }
  };
})();
