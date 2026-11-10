/* ==========================================================================
   overlay.js — capas HTML encima del canvas.

   cartela(opts)
     Cartela de museo: ancla + filete finísimo + texto pequeño. Aparece
     mientras el progreso de su zona está en `range` y se va después.
     Todo está atado al scroll (reversible), no a temporizadores.

   screenQuad(el, opts)
     Coloca un iframe/imagen/elemento sobre una pantalla del vídeo con
     matrix3d (homografía de 4 puntos), interpolando las esquinas entre
     keyframes. Se sincroniza con el fotograma REALMENTE dibujado, así
     la pantalla HTML nunca se despega de la imagen aunque falten fotogramas.

   Solo se escriben transform, opacity y clip-path.
   ========================================================================== */
(function () {
  var EV = (window.EV = window.EV || {});

  var items = [];   // { zone, update(p, active), hide() }

  function clamp01(v) { return v < 0 ? 0 : v > 1 ? 1 : v; }
  function expoOut(t) { return t >= 1 ? 1 : 1 - Math.pow(2, -10 * t); }
  function cubicOut(t) { return 1 - Math.pow(1 - t, 3); }

  /* Escribe un estilo solo si cambia (evita invalidaciones inútiles). */
  function writer(el) {
    var cache = {};
    return function (prop, val) {
      if (cache[prop] === val) return;
      cache[prop] = val;
      el.style[prop] = val;
    };
  }

  /* ---------------------------------------------------------------------
     Cartela
     opts: { zone, range:[from,to], objeto, texto, tecnica, x, y, xm, ym,
             side:'right'|'left', parent }
     --------------------------------------------------------------------- */
  function cartela(opts) {
    var el = document.createElement('div');
    el.className = 'cartela';
    if (opts.side === 'left') el.dataset.side = 'left';
    el.style.setProperty('--x', opts.x || '50%');
    el.style.setProperty('--y', opts.y || '50%');
    if (opts.xm) el.style.setProperty('--x-m', opts.xm);
    if (opts.ym) el.style.setProperty('--y-m', opts.ym);

    var anchor = document.createElement('span');
    anchor.className = 'cartela__anchor';
    anchor.setAttribute('aria-hidden', 'true');
    var line = document.createElement('span');
    line.className = 'cartela__line';
    line.setAttribute('aria-hidden', 'true');
    var body = document.createElement('div');
    body.className = 'cartela__body';

    var obj = document.createElement('p');
    obj.className = 'cartela__obj';
    obj.textContent = opts.objeto;
    body.appendChild(obj);
    if (opts.texto) {
      var tx = document.createElement('p');
      tx.className = 'cartela__text';
      tx.textContent = opts.texto;
      body.appendChild(tx);
    }
    if (opts.tecnica) {
      var tc = document.createElement('p');
      tc.className = 'cartela__tech';
      tc.textContent = opts.tecnica;
      body.appendChild(tc);
    }
    el.appendChild(anchor);
    el.appendChild(line);
    el.appendChild(body);
    (opts.parent || document.body).appendChild(el);

    if (EV.mode !== 'cine') return el; // modo fijo: estática y visible (CSS)

    var from = opts.range[0], to = opts.range[1];
    var span = Math.max(0.0001, to - from);
    var wEl = writer(el), wLine = writer(line), wBody = writer(body);

    items.push({
      zone: opts.zone,
      update: function (p) {
        var local = (p - from) / span;
        if (local <= 0 || local >= 1) { this.hide(); return; }
        // entrada: ancla → filete → texto; salida: fundido.
        var enter = clamp01(local / 0.28);
        var exit = clamp01((1 - local) / 0.2);
        var lineT = expoOut(clamp01(enter * 1.8));
        var bodyT = cubicOut(clamp01(enter * 1.8 - 0.55));
        wEl('opacity', String(Math.min(clamp01(enter * 6), exit).toFixed(3)));
        wLine('transform', 'scaleX(' + lineT.toFixed(4) + ')');
        wBody('clipPath', 'inset(0 0 ' + ((1 - bodyT) * 100).toFixed(2) + '% 0)');
      },
      hide: function () { wEl('opacity', '0'); }
    });
    return el;
  }

  /* ---------------------------------------------------------------------
     Homografía: cuadrado unidad → cuadrilátero (Heckbert).
     Esquinas en orden: sup-izq, sup-der, inf-der, inf-izq.
     Devuelve matrix3d para un elemento de w × h px con transform-origin 0 0.
     --------------------------------------------------------------------- */
  function quadMatrix(w, h, q) {
    var x0 = q[0][0], y0 = q[0][1], x1 = q[1][0], y1 = q[1][1];
    var x2 = q[2][0], y2 = q[2][1], x3 = q[3][0], y3 = q[3][1];
    var sx = x0 - x1 + x2 - x3, sy = y0 - y1 + y2 - y3;
    var a, b, c, d, e, f, g, hh;
    if (Math.abs(sx) < 1e-9 && Math.abs(sy) < 1e-9) {
      a = x1 - x0; b = x2 - x1; c = x0;
      d = y1 - y0; e = y2 - y1; f = y0;
      g = 0; hh = 0;
    } else {
      var dx1 = x1 - x2, dx2 = x3 - x2, dy1 = y1 - y2, dy2 = y3 - y2;
      var den = dx1 * dy2 - dx2 * dy1;
      if (Math.abs(den) < 1e-12) return null;
      g = (sx * dy2 - dx2 * sy) / den;
      hh = (dx1 * sy - sx * dy1) / den;
      a = x1 - x0 + g * x1; b = x3 - x0 + hh * x3; c = x0;
      d = y1 - y0 + g * y1; e = y3 - y0 + hh * y3; f = y0;
    }
    // u = X/w, v = Y/h  →  matrix3d en orden de columnas.
    return 'matrix3d(' +
      (a / w) + ',' + (d / w) + ',0,' + (g / w) + ',' +
      (b / h) + ',' + (e / h) + ',0,' + (hh / h) + ',' +
      '0,0,1,0,' +
      c + ',' + f + ',0,1)';
  }

  function lerp(a, b, t) { return a + (b - a) * t; }

  /* Esquinas interpoladas para un fotograma (puede ser fraccional). */
  function cornersAt(keys, frame) {
    if (frame < keys[0].f || frame > keys[keys.length - 1].f) return null;
    var k = 0;
    while (k < keys.length - 2 && frame > keys[k + 1].f) k++;
    var A = keys[k], B = keys[Math.min(k + 1, keys.length - 1)];
    var t = B.f === A.f ? 0 : (frame - A.f) / (B.f - A.f);
    var out = [];
    for (var i = 0; i < 4; i++) out.push([lerp(A.c[i][0], B.c[i][0], t), lerp(A.c[i][1], B.c[i][1], t)]);
    return out;
  }

  /* ---------------------------------------------------------------------
     screenQuad(el, opts)
     opts: {
       zone,
       keyframes: [{ f, c:[[x,y]×4] }]  ó  { desktop:[…], mobile:[…] }
                  (coordenadas normalizadas 0–1 de la imagen original)
       smooth: false  → usa el fotograma dibujado (bloqueo exacto a la imagen)
               true   → usa el fotograma continuo (más suave si la imagen ya
                        está interpolada o hay muchos fotogramas)
     }
     --------------------------------------------------------------------- */
  function screenQuad(el, opts) {
    el.classList.add('quad');
    var size = { w: 0, h: 0 };
    function measure() {
      // offsetWidth/Height ignoran transforms: tamaño intrínseco del elemento.
      size.w = el.offsetWidth || 1;
      size.h = el.offsetHeight || 1;
    }
    measure();
    window.addEventListener('resize', measure);

    var wEl = writer(el);
    var keysFor = function () {
      var k = opts.keyframes;
      if (Array.isArray(k)) return k;
      return k[EV.sequence.variant()] || k.desktop;
    };

    var api = {
      zone: opts.zone,
      update: function (p, active) {
        if (!active) { this.hide(); return; }
        var d = EV.sequence.drawn();
        if (d.id !== opts.zone || d.frame < 0) { this.hide(); return; }
        var frame = opts.smooth ? EV.sequence.wanted().f : d.frame;
        var q = cornersAt(keysFor(), frame);
        if (!q) { this.hide(); return; }
        var pts = q.map(function (c) { return EV.sequence.imageToScreen(c[0], c[1]); });
        var m = quadMatrix(size.w, size.h, pts);
        if (!m) { this.hide(); return; }
        wEl('transform', m);
        wEl('opacity', '1');
      },
      hide: function () { wEl('opacity', '0'); },
      measure: measure
    };
    items.push(api);
    return api;
  }

  EV.overlay = {
    cartela: cartela,
    screenQuad: screenQuad,
    quadMatrix: quadMatrix,

    /* Llamado una vez por tick, DESPUÉS de dibujar el canvas. */
    update: function () {
      var active = EV.zones.active();
      for (var i = 0; i < items.length; i++) {
        var it = items[i];
        it.update(EV.zones.progress(it.zone), it.zone === active);
      }
    }
  };
})();
