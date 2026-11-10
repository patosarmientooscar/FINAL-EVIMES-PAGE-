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
    /* opts.corners: esquinas FIJAS en espacio de imagen (función o
       { desktop, mobile }). Para un keyframe con cámara: la cámara mueve la
       imagen y la capa la sigue sola. Con fotogramas reales se pasa a
       opts.keyframes (tracking por fotograma) sin tocar nada más. */
    var cornersFor = function () {
      var c = typeof opts.corners === 'function' ? opts.corners() : opts.corners;
      if (!c) return null;
      return Array.isArray(c) ? c : (c[EV.sequence.variant()] || c.desktop);
    };

    var api = {
      zone: opts.zone,
      update: function (p, active) {
        if (!active) { this.hide(); return; }
        var d = EV.sequence.drawn();
        if (d.id !== opts.zone || d.frame < 0) { this.hide(); return; }
        var q;
        if (opts.corners) q = cornersFor();
        else q = cornersAt(keysFor(), opts.smooth ? EV.sequence.wanted().f : d.frame);
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

  /* ---------------------------------------------------------------------
     Scrim local: degradado navy (0–55 %) SOLO detrás de un bloque de texto.
     Nunca un velo a pantalla completa.

     scrim(target, { zone, shape:'radial'|'left'|'right', intensity, range })
       intensity : mínimo declarado por la zona (0–0.55).
       range     : [a,b] de progreso en el que existe (opcional; si no, sigue
                   la opacidad del propio texto).
     Cada tick: mide el brillo medio del fotograma bajo la caja del texto y
     sube la intensidad lo justo para mantener AA (4.5:1, o 3:1 si todo el
     texto del bloque es grande). Solo se anima opacity.
     --------------------------------------------------------------------- */
  var SCRIM_MAX = 0.55;
  var L_TEXT = 0.772;    // luminancia relativa de --stone (#e9e3d8)
  var L_NAVY = 0.0034;   // luminancia relativa de --navy (#080b14)
  function lin2s(L) { return L <= 0.0031308 ? L * 12.92 : 1.055 * Math.pow(L, 1 / 2.4) - 0.055; }
  function s2lin(s) { return s <= 0.04045 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4); }
  var S_NAVY = lin2s(L_NAVY);

  /* Contraste de un texto (luminancia del color Lt, alfa ta) sobre un fondo Lb
     cubierto por navy con alfa a. Las mezclas ocurren en sRGB, como el navegador. */
  function contrastWith(a, Lb, Lt, ta) {
    var sb = (1 - a) * lin2s(Lb) + a * S_NAVY;
    var st = ta * lin2s(Lt) + (1 - ta) * sb;
    var L1 = s2lin(st), L2 = s2lin(sb);
    return (Math.max(L1, L2) + 0.05) / (Math.min(L1, L2) + 0.05);
  }

  /* Alfa de navy mínimo para alcanzar `ratio` (bisección; >0.55 = imposible). */
  function alphaFor(Lb, ratio, Lt, ta) {
    Lt = Lt == null ? L_TEXT : Lt; ta = ta == null ? 1 : ta;
    if (contrastWith(0, Lb, Lt, ta) >= ratio) return 0;
    if (contrastWith(1, Lb, Lt, ta) < ratio) return Infinity;
    var lo = 0, hi = 1;
    for (var i = 0; i < 18; i++) {
      var mid = (lo + hi) / 2;
      if (contrastWith(mid, Lb, Lt, ta) >= ratio) hi = mid; else lo = mid;
    }
    return hi;
  }

  function parseColor(c) {
    var m = c.match(/rgba?\(([^)]+)\)/);
    if (!m) return { L: L_TEXT, a: 1 };
    var p = m[1].split(/[\s,\/]+/).filter(Boolean).map(parseFloat);
    var lin = function (v) { return s2lin(v / 255); };
    return { L: 0.2126 * lin(p[0]) + 0.7152 * lin(p[1]) + 0.0722 * lin(p[2]), a: p[3] == null ? 1 : p[3] };
  }

  /* Recorre los textos del bloque: cada uno con su tamaño (umbral AA 4.5 o 3
     si es grande: ≥24px, o ≥18.66px en negrita) y su color real (incl. alfa). */
  function textProfile(el) {
    var out = [], seen = {};
    var walk = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
    var n;
    while ((n = walk.nextNode())) {
      if (!n.nodeValue.trim()) continue;
      var cs = getComputedStyle(n.parentElement);
      var px = parseFloat(cs.fontSize), bold = parseInt(cs.fontWeight, 10) >= 700;
      var c = parseColor(cs.color);
      var ratio = (px >= 24 || (bold && px >= 18.66)) ? 3 : 4.5;
      var k = ratio + ':' + c.L.toFixed(4) + ':' + c.a.toFixed(3);
      if (!seen[k]) { seen[k] = 1; out.push({ ratio: ratio, L: c.L, a: c.a }); }
    }
    return out.length ? out : [{ ratio: 4.5, L: L_TEXT, a: 1 }];
  }

  function opacityChain(el, stop) {
    var o = 1;
    for (var n = el; n && n !== stop; n = n.parentElement) {
      var v = n.style.opacity;
      if (v !== '') o *= +v;
    }
    return o;
  }

  var warned = {};

  function scrim(target, opts) {
    var parent = target.parentElement;
    var el = document.createElement('div');
    el.className = 'scrim scrim--' + (opts.shape || 'radial');
    el.setAttribute('aria-hidden', 'true');
    parent.insertBefore(el, target);

    var stage = target.closest('.zone__stage');
    var base = Math.min(SCRIM_MAX, Math.max(0, opts.intensity == null ? 0.25 : opts.intensity));
    var plateau = opts.shape === 'left' || opts.shape === 'right' ? 1 : 0.8; // alfa efectivo en el borde del texto
    var profile = null;
    var cur = base;
    var wEl = writer(el);
    var lastKey = '', need = base;
    var box = { w: -1, h: -1, x: 0, y: 0 };

    function layout(rect, prect) {
      var w, h, x, y, shape = opts.shape || 'radial';
      var py = shape === 'radial' ? Math.max(72, rect.height * 1.1) : Math.max(48, rect.height * 0.45);
      if (shape === 'radial') {
        var px = Math.max(96, rect.width * 0.55);
        w = rect.width + px * 2; h = rect.height + py * 2;
        x = rect.left - prect.left - px; y = rect.top - prect.top - py;
      } else {
        var fade = Math.max(96, rect.width * 0.45);
        if (shape === 'left') {
          // del borde izquierdo de la pantalla hasta pasado el texto
          x = -prect.left; w = rect.right + fade;
          el.style.setProperty('--stop', ((rect.right / w) * 100).toFixed(2) + '%');
        } else {
          x = rect.left - prect.left - fade; w = (window.innerWidth - rect.left) + fade;
          el.style.setProperty('--stop', ((fade / w) * 100).toFixed(2) + '%');
        }
        h = rect.height + py * 2; y = rect.top - prect.top - py;
        el.style.setProperty('--fade', Math.round(py) + 'px');
      }
      if (Math.abs(w - box.w) > 0.5 || Math.abs(h - box.h) > 0.5) {
        box.w = w; box.h = h;
        el.style.width = w.toFixed(1) + 'px';
        el.style.height = h.toFixed(1) + 'px';
      }
      wEl('transform', 'translate3d(' + x.toFixed(1) + 'px,' + y.toFixed(1) + 'px,0)');
    }

    var api = {
      zone: opts.zone,
      update: function (p, active) {
        if (!active) { this.hide(); return; }
        var vis = opacityChain(target, stage);
        if (opts.range) {
          var a = opts.range[0], b = opts.range[1], e = 0.06;
          vis *= clamp01((p - a) / e) * clamp01((b - p) / e);
        }
        if (vis <= 0.001) { this.hide(); return; }

        var rect = target.getBoundingClientRect();
        if (!rect.width || !rect.height) { this.hide(); return; }
        var prect = parent.getBoundingClientRect();
        layout(rect, prect);

        if (profile === null) profile = textProfile(target);

        // Brillo bajo el texto: solo se recalcula si cambia el fotograma o la caja.
        var d = EV.sequence.drawn();
        var key = d.key + '|' + Math.round(rect.left) + ',' + Math.round(rect.top) + ',' + Math.round(rect.width) + ',' + Math.round(rect.height);
        if (key !== lastKey) {
          lastKey = key;
          var Lb = EV.sequence.luminanceUnder(rect);
          var req = 0;
          if (Lb == null) req = base;
          else profile.forEach(function (t) { req = Math.max(req, alphaFor(Lb, t.ratio, t.L, t.a) / plateau); });
          if (req > SCRIM_MAX && !warned[key]) {
            warned[key] = true;
            console.warn('[scrim] AA no alcanzable con el tope de 55 % en ' + opts.zone + ' (fotograma ' + d.frame + '): ajusta el encuadre o mueve el texto.', target);
          }
          need = Math.min(SCRIM_MAX, Math.max(base, req));
          el.dataset.aa = req > SCRIM_MAX ? 'no' : 'si';
        }
        // Subir rápido (legibilidad primero), bajar despacio (sin parpadeo).
        cur += (need - cur) * (need > cur ? 0.5 : 0.12);
        wEl('opacity', ((cur / SCRIM_MAX) * vis).toFixed(3));
      },
      hide: function () { wEl('opacity', '0'); },
      intensity: function () { return cur; }
    };
    items.push(api);
    return api;
  }

  /* Crea los scrims que declara la config de una zona (manifest.js). */
  function applyScrims(zone) {
    var list = zone.cfg.scrim || [];
    list.forEach(function (s) {
      zone.stage.querySelectorAll(s.target).forEach(function (t) {
        scrim(t, { zone: zone.cfg.id, shape: s.shape, intensity: s.intensity, range: s.range });
      });
    });
  }

  EV.overlay = {
    cartela: cartela,
    screenQuad: screenQuad,
    quadMatrix: quadMatrix,
    scrim: scrim,
    applyScrims: applyScrims,
    contrastAlpha: alphaFor,
    contrast: contrastWith, // (alfa navy, L fondo, L texto, alfa texto) → ratio WCAG

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
