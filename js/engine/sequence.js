/* ==========================================================================
   sequence.js — reproductor de secuencias de fotogramas en <canvas>.

   - Un único canvas fijo para toda la película.
   - Variante desktop/mobile según ancho, orientación y devicePixelRatio.
   - Carga PROGRESIVA: solo la zona activa y, cuando el usuario ya se mueve
     y la activa está completa, la siguiente. Primero 1 de cada 4 fotogramas,
     luego el resto. Las zonas lejanas nunca se piden y las que quedan lejos
     se liberan de memoria.
   - Si un fotograma no está, dibuja el más cercano cargado.
   - object-fit: cover, nítido en retina (DPR limitado a 2).
   - Sin imágenes reales (ready:false) dibuja un placeholder generado.
   ========================================================================== */
(function () {
  var EV = (window.EV = window.EV || {});

  var MAX_INFLIGHT = 6;
  var COARSE_STEP = 4;

  var canvas, ctx;
  var cssW = 0, cssH = 0, dpr = 1;
  var variant = 'desktop';
  var records = {};        // id -> { cfg, index, images[], state Uint8Array (0 nada, 1 pedido, 2 listo, 3 error) }
  var order = [];          // ids en orden
  var queue = [];          // [{id, i}]
  var inflight = 0;
  var activeIndex = 0;
  var userMoved = false;
  var stillMode = false;

  var want = { id: null, f: 0 };     // lo que se debería mostrar
  var drawn = { id: null, frame: -1, key: '' };
  var dirty = true;
  var cover = { s: 1, dx: 0, dy: 0, iw: 1920, ih: 1080 }; // transform imagen → pantalla (px CSS)
  var waiters = [];

  /* ---------- utilidades ---------- */
  function pad(n) { return String(n).padStart(4, '0'); }
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }

  function pickVariant() {
    var w = window.innerWidth, h = window.innerHeight;
    var portrait = h > w * 1.1;
    // Pantallas estrechas o en vertical → mobile (encuadre 9:16).
    // Una tablet apaisada con DPR alto sigue siendo desktop.
    return (w < 768 || portrait) ? 'mobile' : 'desktop';
  }

  function url(rec, i) {
    var c = rec.cfg;
    return 'assets/zones/' + c.slug + '/' + variant + '/' + pad(i + 1) + '.' + (c.ext || 'avif');
  }

  /* ---------- tamaño del canvas ---------- */
  function resize() {
    var w = canvas.clientWidth, h = canvas.clientHeight;
    var nd = Math.min(window.devicePixelRatio || 1, 2);
    if (w === cssW && h === cssH && nd === dpr) return;
    cssW = w; cssH = h; dpr = nd;
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    var nv = pickVariant();
    if (nv !== variant) {
      variant = nv;
      // Cambia el encuadre: se descarta lo cargado de la otra variante.
      order.forEach(function (id) { evict(id); });
      plan();
    }
    dirty = true;
  }

  /* ---------- carga ---------- */
  function evict(id) {
    var r = records[id];
    if (!r || !r.cfg.ready) return;
    r.gen++; // invalida cargas en curso de esta zona
    for (var i = 0; i < r.images.length; i++) {
      if (r.images[i]) { r.images[i].src = ''; r.images[i] = null; }
    }
    r.state.fill(0);
  }

  function enqueueZone(id, framesOverride) {
    var r = records[id];
    if (!r || !r.cfg.ready) return;
    var n = r.cfg.frames;
    var list = framesOverride || (function () {
      var coarse = [], rest = [];
      for (var i = 0; i < n; i++) (i % COARSE_STEP === 0 || i === n - 1 ? coarse : rest).push(i);
      return coarse.concat(rest);
    })();
    list.forEach(function (i) { if (r.state[i] === 0) queue.push({ id: id, i: i }); });
  }

  function zoneComplete(id) {
    var r = records[id];
    if (!r || !r.cfg.ready) return true;
    for (var i = 0; i < r.state.length; i++) if (r.state[i] < 2) return false;
    return true;
  }

  // Recalcula qué se pide, en qué orden, y qué se libera.
  function plan() {
    queue.length = 0;
    var cur = order[activeIndex];
    if (stillMode) {
      var rs = records[cur];
      enqueueZone(cur, [rs.cfg.poster || 0]);
      var nxt = order[activeIndex + 1];
      if (nxt) enqueueZone(nxt, [records[nxt].cfg.poster || 0]);
    } else {
      enqueueZone(cur);
      var next = order[activeIndex + 1];
      if (next && userMoved) enqueueZone(next);
    }
    // Liberar todo lo que está a más de una zona de distancia.
    order.forEach(function (id, idx) { if (Math.abs(idx - activeIndex) > 1) evict(id); });
    pump();
  }

  function pump() {
    while (inflight < MAX_INFLIGHT && queue.length) {
      var t = queue.shift();
      var r = records[t.id];
      if (!r || r.state[t.i] !== 0) continue;
      load(r, t.i);
    }
  }

  function load(r, i) {
    r.state[i] = 1;
    inflight++;
    var img = new Image();
    img.decoding = 'async';
    var gen = r.gen;
    img.src = url(r, i);
    var done = function (ok) {
      inflight--;
      if (gen !== r.gen) { pump(); return; } // la zona fue liberada mientras cargaba
      if (ok) { r.images[i] = img; r.state[i] = 2; if (r.cfg.id === want.id) dirty = true; }
      else r.state[i] = 3;
      resolveWaiters();
      // Zona activa completa → empezar la siguiente (si el usuario ya se mueve).
      if (!stillMode && r.index === activeIndex && userMoved && zoneComplete(r.cfg.id)) {
        var next = order[activeIndex + 1];
        if (next && queue.length === 0) enqueueZone(next);
      }
      pump();
    };
    (img.decode ? img.decode() : Promise.resolve()).then(function () { done(true); }, function () { done(false); });
  }

  function nearestLoaded(r, i) {
    if (!r.cfg.ready) return i;
    var n = r.cfg.frames;
    for (var d = 0; d < n; d++) {
      var a = i - d, b = i + d;
      if (a >= 0 && r.state[a] === 2) return a;
      if (b < n && r.state[b] === 2) return b;
    }
    return -1;
  }

  function resolveWaiters() {
    waiters = waiters.filter(function (w) {
      var r = records[w.id];
      var ok = !r.cfg.ready || r.state[r.cfg.poster || 0] === 2 || nearestLoaded(r, 0) !== -1;
      if (ok) { clearTimeout(w.timer); w.resolve(); }
      return !ok;
    });
  }

  /* ---------- dibujo ---------- */
  function computeCover(iw, ih) {
    var s = Math.max(cssW / iw, cssH / ih);
    cover.s = s; cover.iw = iw; cover.ih = ih;
    cover.dx = (cssW - iw * s) / 2;
    cover.dy = (cssH - ih * s) / 2;
  }

  function draw() {
    var r = records[want.id];
    if (!r || !cssW) return;
    var n = r.cfg.frames;
    var target = clamp(Math.round(want.f), 0, n - 1);
    var frame = nearestLoaded(r, target);
    var key = want.id + ':' + frame + ':' + cssW + 'x' + cssH + ':' + variant;
    if (!dirty && key === drawn.key) return;
    dirty = false;

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    if (frame === -1) {
      // Nada cargado aún: navy liso. drawn.frame = -1 para que las capas lo sepan.
      ctx.fillStyle = '#080b14';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      drawn.id = want.id; drawn.frame = -1; drawn.key = key;
      return;
    }

    if (r.cfg.ready) {
      var img = r.images[frame];
      computeCover(img.naturalWidth, img.naturalHeight);
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(img, cover.dx * dpr, cover.dy * dpr, cover.iw * cover.s * dpr, cover.ih * cover.s * dpr);
    } else {
      var v = EV.manifest.variants[variant];
      computeCover(v.w, v.h);
      ctx.fillStyle = '#080b14';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.setTransform(cover.s * dpr, 0, 0, cover.s * dpr, cover.dx * dpr, cover.dy * dpr);
      EV.placeholder.draw(ctx, r.cfg, frame, n, v.w, v.h, r.index);
      // Rótulos en espacio de PANTALLA: nunca los recorta el cover.
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      EV.placeholder.label(ctx, r.cfg, frame, n, r.index, cssW, cssH);
      ctx.setTransform(1, 0, 0, 1, 0, 0);
    }
    drawn.id = want.id; drawn.frame = frame; drawn.key = key;
  }

  /* ---------- API pública ---------- */
  EV.sequence = {
    init: function (el) {
      canvas = el;
      ctx = canvas.getContext('2d', { alpha: false });
      stillMode = EV.mode === 'still';
      variant = pickVariant();
      EV.manifest.zones.forEach(function (cfg, index) {
        records[cfg.id] = { cfg: cfg, index: index, gen: 0, images: new Array(cfg.frames), state: new Uint8Array(cfg.frames) };
        order.push(cfg.id);
      });
      want.id = order[0];
      resize();
      plan(); // al entrar: solo la zona 1
      window.addEventListener('resize', resize);
      var onMove = function () {
        if (userMoved) return;
        userMoved = true;
        window.removeEventListener('wheel', onMove);
        window.removeEventListener('touchmove', onMove);
        window.removeEventListener('keydown', onMove);
        window.removeEventListener('scroll', onMove);
        plan();
      };
      window.addEventListener('wheel', onMove, { passive: true });
      window.addEventListener('touchmove', onMove, { passive: true });
      window.addEventListener('keydown', onMove);
      window.addEventListener('scroll', onMove, { passive: true });
    },

    /* La zona activa cambió (desde zones.js). */
    setActive: function (id) {
      var idx = order.indexOf(id);
      if (idx === -1 || idx === activeIndex && want.id === id) return;
      activeIndex = idx;
      plan();
    },

    /* Progreso 0–1 de una zona → fotograma (llamado en el tick). */
    set: function (id, progress) {
      var r = records[id];
      if (!r) return;
      var f = progress * (r.cfg.frames - 1);
      if (want.id !== id || want.f !== f) { want.id = id; want.f = f; }
    },

    /* Modo fijo: muestra el póster de la zona. */
    showStill: function (id) {
      var r = records[id];
      if (!r) return;
      this.setActive(id);
      want.id = id; want.f = r.cfg.poster || 0;
      dirty = true;
    },

    render: function () { draw(); },
    invalidate: function () { dirty = true; },

    /* Resuelve cuando la zona tiene al menos un fotograma que dibujar (o timeout). */
    whenReady: function (id, timeout) {
      return new Promise(function (resolve) {
        var w = { id: id, resolve: resolve, timer: setTimeout(function () { resolve(); }, timeout || 800) };
        waiters.push(w);
        resolveWaiters();
      });
    },

    /* Lo realmente dibujado: las capas HTML se sincronizan con esto. */
    drawn: function () { return drawn; },
    wanted: function () { return want; },
    variant: function () { return variant; },
    coverTransform: function () { return cover; },

    /* Coordenadas normalizadas de la imagen (0–1) → px CSS del viewport. */
    imageToScreen: function (nx, ny) {
      return [cover.dx + nx * cover.iw * cover.s, cover.dy + ny * cover.ih * cover.s];
    },

    /* Diagnóstico para QA. */
    debug: function () {
      var out = {};
      order.forEach(function (id) {
        var r = records[id], loaded = 0, requested = 0;
        for (var i = 0; i < r.state.length; i++) { if (r.state[i] === 2) loaded++; if (r.state[i] === 1) requested++; }
        out[id] = { ready: r.cfg.ready, loaded: loaded, requested: requested, frames: r.cfg.frames };
      });
      return { variant: variant, active: order[activeIndex], userMoved: userMoved, queue: queue.length, inflight: inflight, zones: out, drawn: Object.assign({}, drawn) };
    }
  };

  /* ==========================================================================
     Placeholder: fondo navy, pasillo en perspectiva que avanza con el
     fotograma (para sentir el ritmo de la cámara), y número de zona y fotograma.
     Se dibuja en espacio de imagen (iw × ih), el cover lo aplica el motor.
     ========================================================================== */
  EV.placeholder = {
    draw: function (ctx, cfg, frame, n, iw, ih, zoneIndex) {
      var t = n > 1 ? frame / (n - 1) : 0;
      var vx = iw * 0.5, vy = ih * 0.46;
      var halfW = iw * 0.46, halfH = ih * 0.44;
      var DOORS = 9;
      var travel = 3.5 * t + zoneIndex * 3.5; // continuo entre zonas

      ctx.lineWidth = Math.max(iw, ih) / 1200;

      // fugas
      ctx.strokeStyle = 'rgba(233,227,216,0.10)';
      ctx.beginPath();
      [[-1, -1], [1, -1], [1, 1], [-1, 1]].forEach(function (c) {
        ctx.moveTo(vx + c[0] * halfW * 3, vy + c[1] * halfH * 3);
        ctx.lineTo(vx, vy);
      });
      ctx.stroke();

      // marcos de puerta que se acercan
      for (var k = 0; k < DOORS; k++) {
        var z = ((k - travel) % DOORS + DOORS) % DOORS + 0.35;
        var sc = 1 / z;
        var a = Math.max(0, Math.min(1, (DOORS - z) / DOORS)) * 0.42;
        ctx.strokeStyle = 'rgba(233,227,216,' + a.toFixed(3) + ')';
        ctx.strokeRect(vx - halfW * sc, vy - halfH * sc, halfW * 2 * sc, halfH * 2 * sc);
      }

      // extra de la zona (p. ej. una pantalla para probar screenQuad)
      var script = EV.zoneScripts && EV.zoneScripts[cfg.id];
      if (script && script.placeholder) script.placeholder(ctx, t, frame, iw, ih);

    },

    /* Rótulos de prueba en px CSS, arriba a la izquierda bajo la cabecera,
       lejos de los titulares (que viven abajo). */
    label: function (ctx, cfg, frame, n, zoneIndex, w, h) {
      var mobile = w < 768;
      var x = mobile ? 16 : 40;
      var y = (mobile ? 60 : 76) + 22;
      var num = String(zoneIndex + 1).padStart(2, '0');
      ctx.textBaseline = 'alphabetic';
      ctx.textAlign = 'left';
      ctx.fillStyle = 'rgba(233,227,216,0.62)';
      ctx.font = '500 11px "Schibsted Grotesk", sans-serif';
      ctx.fillText('ZONA ' + num + ' · ' + cfg.label.toUpperCase() + ' · PLACEHOLDER', x, y);
      ctx.fillStyle = 'rgba(233,227,216,0.42)';
      ctx.font = '11px "Schibsted Grotesk", sans-serif';
      ctx.fillText('fotograma ' + pad(frame + 1) + ' / ' + pad(n), x, y + 17);
    }
  };
})();
