/* ==========================================================================
   oficios.js — "Una línea, cinco oficios".
   Carrusel con scroll horizontal NATIVO (snap) + una sola capa <canvas> 2D
   detrás de los slides con la línea del monograma EH (la misma curva que los
   tubos del hero, constante P) de punta a punta de la pista.
   En cada slide la línea cambia de naturaleza:
     01 plano técnico → retícula   02 tubo de cromo (cuerda)   03 gráfica → "1"
     04 se deshace en texto        05 electrocardiograma
   Entre slides las formas se MEZCLAN por posición (pesos suaves), sin cortes.
   El grado de "forma" de cada slide sigue al scroll con lerp 0.1.
   Movimiento: scroll lateral (trackpad / Shift + rueda), arrastre con inercia,
   swipe, flechas y teclado. La rueda vertical NUNCA se bloquea.
   El canvas solo trabaja con la sección en pantalla. dpr ≤ 2.
   Con movimiento reducido: cada slide con su forma final, quieta; sin inercia.
   ========================================================================== */
(function () {
  var EV = window.EV;
  var root = document.querySelector('[data-oficios]');
  if (!root || !EV) return;

  var pista = root.querySelector('.oficios__pista');
  var cv = root.querySelector('.oficios__linea');
  var ctx = cv.getContext('2d');
  var slides = Array.prototype.slice.call(pista.querySelectorAll('.oficio'));
  var seccion = document.getElementById('que-hacemos');
  var nums = Array.prototype.slice.call(seccion.querySelectorAll('[data-ofi-ir]'));
  var relleno = seccion.querySelector('.oficios__relleno');
  var DATA = window.EVIMES_SERVICIOS || [];
  var quieto = !!EV.reducedMotion || /[?&]modo=fijo/.test(location.search);

  var NAVY = '#0b1020', CIAN = '#00e5ff';
  // Línea central de la banda del logo EH (la misma que js/fondo/onda.js).
  var P = [[0, .506], [.107, .536], [.203, .545], [.574, .485], [.67, .467], [.813, .455], [.909, .467], [1, .495]];

  /* ---------- textos desde js/data/servicios.js (el HTML lleva lo mismo) ---------- */
  slides.forEach(function (s) {
    var d = DATA.filter(function (x) { return x.id === s.dataset.servicio; })[0];
    if (!d) return;
    var n = s.querySelector('.oficio__nombre'), f = s.querySelector('.oficio__frase'), a = s.querySelector('.oficio__mas');
    if (n.textContent !== d.nombre) n.textContent = d.nombre;
    if (f.textContent !== d.frase) f.textContent = d.frase;
    a.href = 'servicios.html#' + d.ancla;
  });
  var RESPUESTA = ((DATA[3] && DATA[3].respuesta) || '') + '   ';

  /* ---------- curva base (tabla x → y a partir de P, Catmull-Rom) ---------- */
  var LUT = (function () {
    var pts = [[-0.12, P[0][1]]].concat(P, [[1.12, P[P.length - 1][1]]]);
    var out = [];
    for (var i = 0; i < pts.length - 1; i++) {
      var p0 = pts[Math.max(0, i - 1)], p1 = pts[i], p2 = pts[i + 1], p3 = pts[Math.min(pts.length - 1, i + 2)];
      for (var s = 0; s < 24; s++) {
        var t = s / 24, t2 = t * t, t3 = t2 * t;
        var f = function (a, b, c, d) { return 0.5 * (2 * b + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t2 + (-a + 3 * b - 3 * c + d) * t3); };
        out.push([f(p0[0], p1[0], p2[0], p3[0]), f(p0[1], p1[1], p2[1], p3[1])]);
      }
    }
    out.push(pts[pts.length - 1]);
    return out;
  })();
  function baseN(u) {                       // u 0..1 → (y − 0.5) del logo
    if (u <= LUT[0][0]) return LUT[0][1] - 0.5;
    for (var i = 1; i < LUT.length; i++) {
      if (LUT[i][0] >= u) { var a = LUT[i - 1], b = LUT[i], k = (u - a[0]) / Math.max(1e-6, b[0] - a[0]); return a[1] + (b[1] - a[1]) * k - 0.5; }
    }
    return LUT[LUT.length - 1][1] - 0.5;
  }

  /* ---------- medidas ---------- */
  var W = 0, H = 0, dpr = 1, hueco = [0, 0], starts = [], sw = 0, pitch = 1, maxS = 0, trackW = 1, cy = 0, movil = false;
  function medir() {
    var r = root.getBoundingClientRect();
    W = Math.round(r.width); H = Math.round(r.height);
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
    starts = slides.map(function (s) { return s.offsetLeft; });
    sw = slides[0].offsetWidth;
    pitch = Math.max(1, (starts[1] || sw) - starts[0]);
    maxS = Math.max(0, pista.scrollWidth - pista.clientWidth);
    trackW = Math.max(1, pista.scrollWidth);
    movil = W < 720;
    cy = H * (movil ? 0.47 : 0.49);
    // Hueco libre del slide 01 entre el número y el nombre (en móvil la retícula va ahí, sin pisar el texto).
    var n0 = slides[0].querySelector('.oficio__num'), t0 = slides[0].querySelector('.oficio__nombre');
    hueco = n0 && t0 ? [n0.getBoundingClientRect().bottom - r.top, t0.getBoundingClientRect().top - r.top] : [cy - H * 0.27, cy + H * 0.27];
    sucio = true;
  }
  function destino(i) { return Math.max(0, Math.min(maxS, starts[i] - starts[0])); }
  function indiceDe(sl) { return Math.max(0, Math.min(slides.length - 1, Math.round(sl / pitch))); }

  /* ---------- formas (en px; y relativa a cy, + = abajo) ---------- */
  function base(x) { return baseN(x / trackW) * H * 1.55; }
  var G = [[0, .07], [.12, .05], [.23, .06], [.34, 0], [.44, -.04], [.53, -.02], [.63, -.14], [.73, -.3]];   // llega al 1 antes del fundido con el 04 y se queda arriba
  function grafica(t) {
    if (t <= 0) return G[0][1] * H;
    for (var i = 1; i < G.length; i++) if (t <= G[i][0]) { var a = G[i - 1], b = G[i]; return (a[1] + (b[1] - a[1]) * (t - a[0]) / (b[0] - a[0])) * H; }
    return G[G.length - 1][1] * H;
  }
  function g(x, m, s) { var d = (x - m) / s; return Math.exp(-d * d); }
  function ecg(t, tiempo) {
    var ph = t * (movil ? 1.6 : 3.2) - tiempo * 0.95;
    ph -= Math.floor(ph);
    var y = -0.03 * g(ph, 0.15, 0.03) + 0.05 * g(ph, 0.335, 0.009) - 0.36 * g(ph, 0.36, 0.011) + 0.14 * g(ph, 0.388, 0.011) - 0.07 * g(ph, 0.62, 0.045);
    var env = 0.35 + 0.65 * smooth(0.28, 0.55, t);           // pico bajo junto al texto
    return y * H * env;
  }
  function smooth(a, b, x) { var t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); }

  /* ---------- cuerda del slide 02 (muelle 1D amortiguado) ---------- */
  var NR = 72, ru = new Float32Array(NR), rv = new Float32Array(NR), racc = 0, rquieta = true;
  function cuerda(t) {
    var x = (t + 0.2) / 1.4 * (NR - 1);
    if (x <= 0 || x >= NR - 1) return 0;
    var i = Math.floor(x), f = x - i;
    return ru[i] + (ru[i + 1] - ru[i]) * f;
  }
  function pasoCuerda() {
    var e = 0;
    for (var i = 1; i < NR - 1; i++) rv[i] += 0.28 * (ru[i - 1] + ru[i + 1] - 2 * ru[i]) - 0.02 * ru[i] - 0.05 * rv[i];
    for (var j = 1; j < NR - 1; j++) { ru[j] = Math.max(-64, Math.min(64, ru[j] + rv[j])); e += Math.abs(ru[j]) + Math.abs(rv[j]); }
    return e;
  }
  var ptr = { x: 0, y: 0, px: 0, py: 0, dentro: false, prev: false };
  root.addEventListener('pointermove', function (e) {
    var r = root.getBoundingClientRect();
    ptr.x = e.clientX - r.left; ptr.y = e.clientY - r.top; ptr.dentro = true;
  }, { passive: true });
  root.addEventListener('pointerleave', function () { ptr.dentro = false; ptr.prev = false; });

  /* ---------- estado ---------- */
  var visible = false, sucio = true, pS = 0, tiempo = 0, escrito = 0, ultimo = 0;

  /* Pesos espaciales: q = índice continuo del slide bajo x. */
  function pesos(x, out) {
    var q = (x - starts[0] - sw / 2) / pitch;
    var n = slides.length;
    if (q <= 0) { out.k = 0; out.f = 0; return; }
    if (q >= n - 1) { out.k = n - 1; out.f = 0; return; }
    var k = Math.floor(q);
    out.k = k; out.f = smooth(0.28, 0.72, q - k);
  }
  function activo(k) { return quieto ? 1 : smooth(0, 1, 1 - Math.abs(pS - k)); }

  function yDe(k, x, ak) {
    var t = (x - starts[k]) / sw, b = base(x);
    switch (k) {
      case 0: return b * (1 - ak);                                   // se ordena: recta
      case 1: return b * (1 - 0.55 * ak) + cuerda(t) * ak;          // tubo + cuerda
      case 2: return b + (grafica(t) - b) * ak;                       // gráfica que sube
      case 3: return b * (1 - 0.5 * ak);                              // se aplana para el texto
      default: return b + (ecg(t, tiempo) - b) * ak;                  // pulso
    }
  }

  /* ---------- dibujo ---------- */
  var xs = new Float32Array(4096), ys = new Float32Array(4096), ls = new Float32Array(4096), wk = new Uint8Array(4096), wf = new Float32Array(4096);
  var cuenta = 0;
  function geometria(sl) {
    var paso = movil ? 2 : 2.5, x0 = sl - 60, x1 = sl + W + 60, i = 0, o = { k: 0, f: 0 }, a = [];
    for (var k = 0; k < slides.length; k++) a[k] = activo(k);
    var acc = 0;
    for (var x = x0; x <= x1 && i < 4096; x += paso, i++) {
      pesos(x, o);
      var y0 = yDe(o.k, x, a[o.k]);
      var y = o.f > 0 ? y0 + (yDe(o.k + 1, x, a[o.k + 1]) - y0) * o.f : y0;
      xs[i] = x - sl; ys[i] = cy + y; wk[i] = o.k; wf[i] = o.f;
      if (i) { var dx = xs[i] - xs[i - 1], dy = ys[i] - ys[i - 1]; acc += Math.sqrt(dx * dx + dy * dy); }
      ls[i] = acc;
    }
    cuenta = i;
    return a;
  }
  function pesoEstilo(s, i) { return wk[i] === s ? 1 - wf[i] : (wk[i] + 1 === s ? wf[i] : 0); }

  function trazo(i0, i1, dy) {
    ctx.beginPath();
    ctx.moveTo(xs[i0], ys[i0] + (dy || 0));
    for (var i = i0 + 1; i <= i1; i++) ctx.lineTo(xs[i], ys[i] + (dy || 0));
  }
  // Recorre la línea en tramos cortos con la opacidad del estilo s.
  function porTramos(s, fn) {
    var CH = 10;
    for (var i0 = 0; i0 < cuenta - 1; i0 += CH) {
      var i1 = Math.min(cuenta - 1, i0 + CH);
      var w = (pesoEstilo(s, i0) + pesoEstilo(s, i1)) / 2;
      if (w < 0.01) continue;
      fn(i0, i1, w);
    }
  }

  function estiloPlano(a) {           // 01: discontinuo + marcas
    ctx.strokeStyle = NAVY; ctx.lineWidth = 1.4; ctx.lineCap = 'butt';
    porTramos(0, function (i0, i1, w) {
      ctx.globalAlpha = w; ctx.setLineDash([9, 7]); ctx.lineDashOffset = -ls[i0];
      trazo(i0, i1); ctx.stroke();
    });
    ctx.setLineDash([]);
    // marcas perpendiculares cada ~48 px
    ctx.lineWidth = 1;
    for (var i = 0; i < cuenta; i += 19) {
      var w = pesoEstilo(0, i); if (w < 0.05) continue;
      ctx.globalAlpha = w * 0.7;
      ctx.beginPath(); ctx.moveTo(xs[i], ys[i] - 5); ctx.lineTo(xs[i], ys[i] + 5); ctx.stroke();
    }
  }
  function reticula(sl, a) {          // 01: columnas que aparecen + cota
    var x0 = starts[0] - sl;
    if (x0 > W || x0 + sw < 0 || a < 0.01) return;
    var cols = movil ? 4 : 6, iz = x0 + sw * (movil ? 0.08 : 0.44), de = x0 + sw * 0.96;
    var gap = movil ? 6 : 10, cw = (de - iz - gap * (cols - 1)) / cols, top = cy - H * 0.27, alto = H * 0.54;
    if (movil) { top = hueco[0] + 40; alto = Math.max(60, hueco[1] - 24 - top); }
    for (var j = 0; j < cols; j++) {
      var al = smooth(j * 0.08, j * 0.08 + 0.45, a);
      if (al <= 0) continue;
      var x = iz + j * (cw + gap), h = alto * (0.4 + 0.6 * al);
      ctx.globalAlpha = al;
      ctx.fillStyle = 'rgba(0,229,255,0.08)'; ctx.fillRect(x, top + (alto - h) / 2, cw, h);
      ctx.strokeStyle = 'rgba(11,16,32,0.22)'; ctx.lineWidth = 1; ctx.strokeRect(x + 0.5, top + (alto - h) / 2 + 0.5, cw - 1, h - 1);
    }
    // cota sobre la retícula
    var ac = smooth(0.5, 1, a);
    if (ac > 0) {
      var yc = top - 16;
      ctx.globalAlpha = ac; ctx.strokeStyle = NAVY; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(iz, yc); ctx.lineTo(de, yc);
      ctx.moveTo(iz, yc - 5); ctx.lineTo(iz, yc + 5); ctx.moveTo(de, yc - 5); ctx.lineTo(de, yc + 5); ctx.stroke();
      ctx.font = '500 11px "Schibsted Grotesk", system-ui, sans-serif';
      var txt = cols * 2 + ' col', tw = ctx.measureText(txt).width, cx = (iz + de) / 2;
      ctx.fillStyle = '#e6e4df'; ctx.fillRect(cx - tw / 2 - 6, yc - 8, tw + 12, 16);
      ctx.fillStyle = NAVY; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(txt, cx, yc + 0.5);
      ctx.textAlign = 'start'; ctx.textBaseline = 'alphabetic';
    }
  }
  /* 02: tubo de cromo. Cada capa es UNA forma rellena (borde superior +
     inferior) cuyo grosor sigue al peso del estilo: el tubo se afina hasta
     ser la línea de los vecinos, sin tramos ni costuras. */
  function estiloCromo(a) {
    var T0 = 2 + (movil ? 14 : 20) * a;
    var capas = [[1, 0, '#2a3142'], [0.84, -0.02, '#7d889b'], [0.64, -0.08, '#c7cfda'], [0.38, -0.15, '#eef2f7'], [0.12, -0.21, '#ffffff']];
    var i = 0;
    while (i < cuenta) {
      while (i < cuenta && pesoEstilo(1, i) < 0.01) i++;
      var i0 = i;
      while (i < cuenta && pesoEstilo(1, i) >= 0.01) i++;
      var i1 = i - 1;
      if (i1 - i0 < 2) continue;
      ctx.globalAlpha = 1;
      for (var c = 0; c < capas.length; c++) {
        var k = capas[c][0], dy = capas[c][1];
        ctx.beginPath();
        for (var p = i0; p <= i1; p++) {
          var t = Math.max(1.2, T0 * pesoEstilo(1, p));
          var y = ys[p] + t * dy - t * k / 2;
          if (p === i0) ctx.moveTo(xs[p], y); else ctx.lineTo(xs[p], y);
        }
        for (var q = i1; q >= i0; q--) {
          var t2 = Math.max(1.2, T0 * pesoEstilo(1, q));
          ctx.lineTo(xs[q], ys[q] + t2 * dy + t2 * k / 2);
        }
        ctx.closePath();
        ctx.fillStyle = c === 0 ? '#2a3142' : capas[c][2];
        ctx.fill();
      }
      // filo cian en la parte baja del tubo
      ctx.beginPath();
      for (var e = i0; e <= i1; e++) {
        var te = T0 * pesoEstilo(1, e);
        if (e === i0) ctx.moveTo(xs[e], ys[e] + te * 0.42); else ctx.lineTo(xs[e], ys[e] + te * 0.42);
      }
      ctx.strokeStyle = CIAN; ctx.lineWidth = Math.max(0.8, T0 * 0.06); ctx.globalAlpha = Math.min(1, a * 1.2);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }
  function estiloSolido(s, ancho) {
    ctx.strokeStyle = NAVY; ctx.lineWidth = ancho; ctx.lineJoin = 'round'; ctx.lineCap = 'butt';
    porTramos(s, function (i0, i1, w) { ctx.globalAlpha = w; trazo(i0, i1); ctx.stroke(); });
  }
  function puntoEn(xt, sl) {           // y de la línea en la x de pista xt
    var xv = xt - sl;
    for (var i = 1; i < cuenta; i++) if (xs[i] >= xv) return ys[i];
    return cy;
  }
  function marcasGrafica(sl, a) {     // 03: vértices + el "1"
    var x0 = starts[2] - sl;
    if (x0 > W || x0 + sw < 0 || a < 0.02) return;
    ctx.fillStyle = NAVY;
    for (var i = 1; i < G.length - 1; i++) {
      var xt = starts[2] + G[i][0] * sw;
      ctx.globalAlpha = a * 0.9; ctx.beginPath(); ctx.arc(xt - sl, puntoEn(xt, sl), 2.6, 0, 6.283); ctx.fill();
    }
    var xe = starts[2] + 0.73 * sw, ye = puntoEn(xe, sl), r = movil ? 13 : 16, ab = smooth(0.55, 1, a);
    if (ab <= 0) return;
    ctx.globalAlpha = ab;
    ctx.fillStyle = CIAN; ctx.beginPath(); ctx.arc(xe - sl, ye, r, 0, 6.283); ctx.fill();
    ctx.strokeStyle = NAVY; ctx.lineWidth = 1.2; ctx.stroke();
    ctx.fillStyle = NAVY; ctx.font = '600 ' + (movil ? 14 : 17) + 'px Fraunces, Georgia, serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('1', xe - sl, ye + 1);
    ctx.textAlign = 'start'; ctx.textBaseline = 'alphabetic';
  }
  function textoIA(sl, a) {           // 04: la respuesta corre a lo largo del trazo
    var x0 = starts[3] - sl;
    // tramo con línea normal donde todavía no hay texto
    var fs = movil ? 12 : 15;
    ctx.font = '500 ' + fs + 'px "Schibsted Grotesk", system-ui, sans-serif';
    var iz = starts[3] + sw * (movil ? 0.05 : 0.1), de = starts[3] + sw * 0.95, disp = de - iz;
    var n = Math.floor(escrito), txt = RESPUESTA.slice(0, n);
    var anchoTxt = ctx.measureText(txt).width;
    // Si no cabe, el texto corre: se ven los últimos caracteres que caben.
    var desde = 0;
    while (anchoTxt > disp && desde < txt.length) { desde++; anchoTxt = ctx.measureText(txt.slice(desde)).width; }
    var vis = txt.slice(desde), cabeza = iz + anchoTxt;
    // línea: hasta el comienzo del texto y desde la cabeza
    ctx.strokeStyle = NAVY; ctx.lineWidth = 1.5;
    porTramos(3, function (i0, i1, w) {
      var xm = (xs[i0] + xs[i1]) / 2 + sl;
      var dentro = xm > iz - 4 && xm < cabeza + 6;
      var k = dentro ? (1 - a) : 1;
      if (k * w < 0.01) return;
      ctx.globalAlpha = w * k; trazo(i0, i1); ctx.stroke();
    });
    if (x0 > W || x0 + sw < 0 || a < 0.02 || !vis.length) return;
    // letras sobre la curva
    ctx.fillStyle = NAVY; ctx.globalAlpha = a;
    var x = iz;
    for (var c = 0; c < vis.length; c++) {
      var ch = vis[c], cw = ctx.measureText(ch).width, xm = x + cw / 2;
      var y1 = puntoEn(xm - 2, sl), y2 = puntoEn(xm + 2, sl), ang = Math.atan2(y2 - y1, 4);
      ctx.save(); ctx.translate(xm - sl, (y1 + y2) / 2); ctx.rotate(ang);
      ctx.fillText(ch, -cw / 2, fs * 0.34); ctx.restore();
      x += cw;
    }
    // cursor cian en la cabeza
    var yc = puntoEn(cabeza + 3, sl);
    var parp = quieto ? 1 : (Math.sin(tiempo * 9) > -0.2 ? 1 : 0.15);
    ctx.globalAlpha = a * parp; ctx.fillStyle = CIAN;
    ctx.fillRect(cabeza - sl + 2, yc - fs * 0.62, 2.5, fs * 1.15);
  }
  function puntoPulso(sl, a) {        // 05: brillo cian en la punta del pulso
    var xe = starts[4] + sw * 0.94, xv = xe - sl;
    if (xv < -20 || xv > W + 20 || a < 0.05) return;
    var ye = puntoEn(xe, sl);
    var gr = ctx.createRadialGradient(xv, ye, 0, xv, ye, 16);
    gr.addColorStop(0, 'rgba(0,229,255,0.9)'); gr.addColorStop(1, 'rgba(0,229,255,0)');
    ctx.globalAlpha = a; ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(xv, ye, 16, 0, 6.283); ctx.fill();
    ctx.fillStyle = NAVY; ctx.beginPath(); ctx.arc(xv, ye, 3, 0, 6.283); ctx.fill();
  }

  function dibujar() {
    var sl = pista.scrollLeft;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);
    var a = geometria(sl);
    reticula(sl, a[0]);
    estiloPlano(a[0]);
    estiloCromo(a[1]);
    estiloSolido(2, 2);
    marcasGrafica(sl, a[2]);
    textoIA(sl, a[3]);
    estiloSolido(4, 2);
    puntoPulso(sl, a[4]);
    ctx.globalAlpha = 1;
  }

  /* ---------- bucle (en gsap.ticker: el mismo de toda la home) ---------- */
  function tick(time, dtMs) {
    if (!visible) return;
    var dt = Math.min((dtMs || 16.7) / 1000, 0.1);
    var sl = pista.scrollLeft;
    var objetivo = sl / pitch;
    if (quieto) { pS = objetivo; }
    else {
      var k = 1 - Math.pow(0.9, dt * 60);                       // lerp 0.1 a 60 fps
      pS += (objetivo - pS) * k;
      tiempo += dt;
      // escritura del slide 04 mientras está a la vista
      var a3 = activo(3);
      if (a3 > 0.6) { escrito += dt * 24; if (escrito > RESPUESTA.length + 60) escrito = 0; }
      else if (a3 < 0.1) escrito = 0;
      // cuerda del 02: el puntero la empuja con su velocidad vertical
      if (ptr.dentro) {
        if (ptr.prev) {
          var vy = (ptr.y - ptr.py) / Math.max(dt * 60, 0.25);
          var tp = (ptr.x + sl - starts[1]) / sw;
          if (Math.abs(vy) > 0.2 && tp > -0.2 && tp < 1.2 && Math.abs(ptr.y - puntoEn(ptr.x + sl, sl)) < 90) {
            for (var i = 1; i < NR - 1; i++) {
              var d = ((i / (NR - 1)) * 1.4 - 0.2 - tp) * sw;
              rv[i] += vy * Math.exp(-d * d / 6400) * 0.12;
            }
            rquieta = false;
          }
        }
        ptr.px = ptr.x; ptr.py = ptr.y; ptr.prev = true;
      }
      if (!rquieta) {
        racc = Math.min(racc + dt, 6 / 90);
        var e = 0;
        while (racc >= 1 / 90) { e = pasoCuerda(); racc -= 1 / 90; }
        if (e > 0 && e < 0.02 * NR) { ru.fill(0); rv.fill(0); rquieta = true; }
      }
    }
    if (quieto && !sucio && Math.abs(sl - ultimo) < 0.5) return;
    ultimo = sl; sucio = false;
    dibujar();
    progreso(sl);
  }

  /* ---------- barra 01–05 ---------- */
  var activoIdx = -1;
  function progreso(sl) {
    relleno.style.transform = 'scaleX(' + (maxS ? sl / maxS : 0).toFixed(4) + ')';
    var i = indiceDe(sl);
    if (i !== activoIdx) {
      activoIdx = i;
      nums.forEach(function (b, j) { if (j === i) b.setAttribute('aria-current', 'true'); else b.removeAttribute('aria-current'); });
    }
  }

  /* ---------- navegación ---------- */
  var tween = null, asentar = 0;
  function libre(on) { pista.classList.toggle('is-libre', on); }
  function ir(i, rapido) {
    i = Math.max(0, Math.min(slides.length - 1, i));
    var x = destino(i);
    if (tween) tween.kill();
    clearTimeout(asentar);
    libre(true);
    if (quieto || rapido === 0) { pista.scrollLeft = x; libre(false); return; }
    tween = gsap.to(pista, { scrollLeft: x, duration: 0.9, ease: 'expo.out', overwrite: true, onComplete: function () { libre(false); tween = null; } });
  }
  seccion.querySelector('[data-ofi-prev]').addEventListener('click', function () { ir(indiceDe(pista.scrollLeft) - 1); });
  seccion.querySelector('[data-ofi-next]').addEventListener('click', function () { ir(indiceDe(pista.scrollLeft) + 1); });
  nums.forEach(function (b) { b.addEventListener('click', function () { ir(+b.dataset.ofiIr); }); });
  pista.addEventListener('keydown', function (e) {
    var i = indiceDe(pista.scrollLeft), t = null;
    if (e.key === 'ArrowRight') t = i + 1; else if (e.key === 'ArrowLeft') t = i - 1;
    else if (e.key === 'Home') t = 0; else if (e.key === 'End') t = slides.length - 1;
    if (t === null) return;
    e.preventDefault(); ir(t);
  });

  // Rueda: SOLO el gesto lateral (trackpad horizontal o Shift + rueda) mueve el
  // carrusel; la rueda vertical sigue bajando la página (llega a Lenis intacta).
  pista.addEventListener('wheel', function (e) {
    var dx = e.deltaX, dy = e.deltaY;
    var lateral = e.shiftKey ? (dx || dy) : (Math.abs(dx) > Math.abs(dy) ? dx : 0);
    if (!lateral) return;
    var px = lateral * (e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? W : 1);
    var sl = pista.scrollLeft;
    if ((px < 0 && sl <= 0) || (px > 0 && sl >= maxS - 1)) return;   // en los bordes, nada que hacer
    e.preventDefault(); e.stopPropagation();
    if (tween) { tween.kill(); tween = null; }
    libre(true);
    pista.scrollLeft = sl + px;
    clearTimeout(asentar);
    asentar = setTimeout(function () { ir(indiceDe(pista.scrollLeft)); }, 140);
  }, { passive: false });

  // Arrastre con ratón + inercia (el táctil es el swipe nativo).
  var drag = null, bloquearClic = false;
  pista.addEventListener('pointerdown', function (e) {
    if (e.pointerType !== 'mouse' || e.button !== 0) return;
    if (tween) { tween.kill(); tween = null; }
    drag = { x: e.clientX, sl: pista.scrollLeft, lx: e.clientX, lt: performance.now(), v: 0, movido: false, id: e.pointerId };
  });
  window.addEventListener('pointermove', function (e) {
    if (!drag || e.pointerId !== drag.id) return;
    var dx = e.clientX - drag.x;
    if (!drag.movido && Math.abs(dx) > 5) {
      drag.movido = true; libre(true); pista.classList.add('is-arrastrando');
      try { pista.setPointerCapture(drag.id); } catch (er) {}
    }
    if (!drag.movido) return;
    var now = performance.now(), dt = Math.max(1, now - drag.lt);
    drag.v = 0.8 * ((e.clientX - drag.lx) / dt) + 0.2 * drag.v;      // px/ms
    drag.lx = e.clientX; drag.lt = now;
    pista.scrollLeft = drag.sl - dx;
  });
  function soltar(e) {
    if (!drag || (e && e.pointerId !== drag.id)) return;
    var d = drag; drag = null;
    pista.classList.remove('is-arrastrando');
    if (!d.movido) return;
    bloquearClic = true; setTimeout(function () { bloquearClic = false; }, 0);
    // Inercia: proyecta la velocidad y cae en el slide más cercano.
    var proy = pista.scrollLeft - (quieto ? 0 : d.v * 260);
    var i = indiceDe(proy);
    var actual = indiceDe(d.sl);
    if (i === actual && Math.abs(pista.scrollLeft - d.sl) > sw * 0.12) i += pista.scrollLeft > d.sl ? 1 : -1;
    ir(i);
  }
  window.addEventListener('pointerup', soltar);
  window.addEventListener('pointercancel', soltar);
  pista.addEventListener('click', function (e) { if (bloquearClic) { e.preventDefault(); e.stopPropagation(); } }, true);
  pista.addEventListener('dragstart', function (e) { e.preventDefault(); });
  pista.addEventListener('scroll', function () { sucio = true; }, { passive: true });

  /* ---------- arranque ---------- */
  function init() {
    medir();
    progreso(pista.scrollLeft);
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (es) { visible = es[0].isIntersecting; if (visible) sucio = true; }, { rootMargin: '80px 0px' }).observe(root);
    } else visible = true;
    window.addEventListener('resize', medir);
    if (window.ResizeObserver) new ResizeObserver(medir).observe(root);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { sucio = true; });
    if (quieto) { escrito = RESPUESTA.length; tiempo = 0.42; }
    if (window.gsap) gsap.ticker.add(tick);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
