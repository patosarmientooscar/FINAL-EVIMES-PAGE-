/* ==========================================================================
   Zona 01 — Fachada.
   - Keyframe a pantalla completa (póster LCP en el HTML; luego el canvas).
   - Letras EVIMES corpóreas retroiluminadas: SVG real (config.logo.fachada)
     colocado con matrix3d desde 4 esquinas (config.fachada.letras).
     Capa trasera = halo cian con mix-blend-mode: screen sobre el fotograma;
     capa delantera = letra casi navy con un fino canto claro.
   - Scroll: 0–25 % se retira el texto · 25–85 % la cámara empuja hacia la
     ventana encendida · 85–100 % dentro de la ventana, cruza el reflejo cian.
   - Placeholder de cámara: camera(p) solo actúa mientras la zona no tenga
     fotogramas (manifest ready:false). Con la secuencia real se apaga sola.
   - ?ajustar=letras: herramienta para colocar las 4 esquinas a ojo.
   ========================================================================== */
(function () {
  var EV = window.EV;
  var ID = 'fachada';
  var CFG = (window.EVIMES_CONFIG && window.EVIMES_CONFIG.fachada) || {};
  var LOGO = window.EVIMES_CONFIG && window.EVIMES_CONFIG.logo && window.EVIMES_CONFIG.logo.fachada;
  var ADJUST = new URLSearchParams(location.search).get('ajustar') === 'letras';
  var STORE = 'evimes.ajustar.letras.';
  var overrides = {};

  function sine(t) { return -(Math.cos(Math.PI * t) - 1) / 2; }

  function corners() {
    var v = EV.sequence.variant();
    return overrides[v] || (CFG.letras && (CFG.letras[v] || CFG.letras.desktop));
  }

  /* ---------- cámara (placeholder del travelling) ---------- */
  function camera(p, view) {
    var win = (CFG.ventana && (CFG.ventana[view.variant] || CFG.ventana.desktop)) || [0.4, 0.3, 0.6, 0.75];
    var a = view.toScreen(win[0], win[1]), b = view.toScreen(win[2], win[3]);
    var ww = b[0] - a[0], wh = b[1] - a[1];
    var wx = (a[0] + b[0]) / 2, wy = (a[1] + b[1]) / 2;
    // A 85 % el hueco de la ventana cubre la pantalla entera (con un 4 % de margen).
    var zFill = Math.max(view.w / ww, view.h / wh) * 1.04;
    var drift = EV.util.range(p, 0, 0.25) * 0.025;          // 0–25 %: respiración mínima
    var u = EV.util.range(p, 0.25, 0.85);                   // 25–85 %: el empuje
    var inside = EV.util.range(p, 0.85, 1);                 // 85–100 %: cruzando el cristal
    var e = sine(u);
    // Zoom logarítmico: avance de cámara de velocidad percibida constante.
    var lz = Math.log(1 + drift) * (1 - e) + Math.log(zFill) * e + Math.log(1.14) * inside;
    // El encuadre se centra en la ventana un poco antes de que la ventana lo llene.
    var m = sine(Math.min(1, u * 1.18));
    return { z: Math.exp(lz), ox: view.w / 2 + (wx - view.w / 2) * m, oy: view.h / 2 + (wy - view.h / 2) * m };
  }

  /* ---------- letras ---------- */

  /* La luz se pinta UNA vez en un canvas (el trazado real del wordmark con
     shadowBlur) y luego solo viaja con matrix3d. Un filtro CSS en vivo
     (blur + drop-shadow) se recalculaba en cada fotograma: picos de 1,5 s. */
  var HALO_PAD = 420;      // margen (px locales) para que la luz se derrame sobre la piedra
  var HALO_RES = 0.5;      // la luz es difusa: media resolución basta
  function paintHalo(svg) {
    var vb = (svg.getAttribute('viewBox') || '0 0 1442 261').split(/[\s,]+/).map(Number);
    var W = vb[2], H = vb[3];
    var cw = Math.round((W + HALO_PAD * 2) * HALO_RES), ch = Math.round((H + HALO_PAD * 2) * HALO_RES);
    var c = document.createElement('canvas');
    c.width = cw; c.height = ch;
    c.style.left = (-HALO_PAD) + 'px';
    c.style.top = (-HALO_PAD) + 'px';
    c.style.width = (W + HALO_PAD * 2) + 'px';
    c.style.height = (H + HALO_PAD * 2) + 'px';
    var ctx = c.getContext('2d');
    var paths = Array.prototype.map.call(svg.querySelectorAll('path'), function (p) { return new Path2D(p.getAttribute('d')); });
    ctx.setTransform(HALO_RES, 0, 0, HALO_RES, (HALO_PAD - vb[0]) * HALO_RES, (HALO_PAD - vb[1]) * HALO_RES);
    // Del halo ancho y tenue al núcleo pegado a la letra. Las capas se SUMAN
    // (lighter), como la luz real; así se iguala la cadena de drop-shadow.
    ctx.globalCompositeOperation = 'lighter';
    [[300, 0.5], [300, 0.5], [300, 0.5], [160, 0.6], [160, 0.6], [70, 0.7], [30, 0.9], [12, 1], [12, 1], [4, 1]].forEach(function (g) {
      ctx.shadowColor = 'rgba(0,229,255,' + g[1] + ')';
      ctx.shadowBlur = g[0] * HALO_RES;
      ctx.fillStyle = 'rgba(0,229,255,' + g[1] + ')';
      paths.forEach(function (p) { ctx.fill(p, 'evenodd'); });
    });
    return c;
  }

  /* Eco del reflejo: las letras desenfocadas, pintadas una vez. El desenfoque
     sale de la sombra de un trazado dibujado fuera del lienzo (compatible con
     todos los navegadores, sin ctx.filter ni filtros CSS en vivo). */
  function paintEcho(svg) {
    var vb = (svg.getAttribute('viewBox') || '0 0 1442 261').split(/[\s,]+/).map(Number);
    var W = vb[2], H = vb[3], pad = 60, res = 0.5, OFF = 20000;
    var c = document.createElement('canvas');
    c.width = Math.round((W + pad * 2) * res); c.height = Math.round((H + pad * 2) * res);
    var ctx = c.getContext('2d');
    var paths = Array.prototype.map.call(svg.querySelectorAll('path'), function (p) { return new Path2D(p.getAttribute('d')); });
    ctx.setTransform(res, 0, 0, res, (pad - vb[0]) * res + OFF, (pad - vb[1]) * res);
    ctx.shadowOffsetX = -OFF;
    ctx.shadowBlur = 48 * res;
    ctx.shadowColor = 'rgb(0,229,255)';
    ctx.fillStyle = '#000';
    paths.forEach(function (p) { ctx.fill(p, 'evenodd'); });
    return c;
  }

  function buildLetters(svg, anchor) {
    function layer(cls) {
      var el = document.createElement('div');
      el.className = 'letras ' + cls;
      el.setAttribute('aria-hidden', 'true');
      return el;
    }
    var halo = layer('letras--halo');
    var luz = document.createElement('div');
    luz.className = 'letras__luz';
    luz.appendChild(paintHalo(svg));
    halo.appendChild(luz);

    var cara = layer('letras--cara');
    cara.appendChild(svg.cloneNode(true));

    // Reflejo: banda suave + las letras invertidas, en screen sobre el fotograma.
    var reflejo = document.createElement('div');
    reflejo.className = 'reflejo';
    reflejo.setAttribute('aria-hidden', 'true');
    var banda = document.createElement('div');
    banda.className = 'reflejo__banda';
    var eco = document.createElement('div');
    eco.className = 'reflejo__letras';
    eco.appendChild(paintEcho(svg));
    banda.appendChild(eco);
    reflejo.appendChild(banda);

    // Orden en <body>: canvas · póster · halo · cara · reflejo · (zonas encima).
    anchor.after(halo, cara, reflejo);

    EV.overlay.screenQuad(halo, { zone: ID, corners: corners });
    EV.overlay.screenQuad(cara, { zone: ID, corners: corners });

    return { halo: halo, luz: luz, cara: cara, reflejo: reflejo, banda: banda };
  }

  /* Encendido: dos parpadeos mínimos e irregulares, < 1 s. Reducido: directo. */
  function ignite(luz) {
    if (EV.reducedMotion || ADJUST) { luz.style.opacity = '1'; return; }
    gsap.timeline({ delay: 0.35 })
      .set(luz, { opacity: 0 })
      .to(luz, { opacity: 0.5, duration: 0.05, ease: 'none' })
      .to(luz, { opacity: 0.06, duration: 0.07, ease: 'none' })
      .to(luz, { opacity: 0.78, duration: 0.04, ease: 'none' }, '+=0.11')
      .to(luz, { opacity: 0.22, duration: 0.05, ease: 'none' }, '+=0.03')
      .to(luz, { opacity: 1, duration: 0.32, ease: 'power2.out' }, '+=0.08');
  }

  /* ---------- "Entra": viaje hasta el pasillo ---------- */
  function wireEnter(stage) {
    var link = stage.querySelector('.entra');
    if (!link) return;
    link.addEventListener('click', function (e) {
      var next = document.getElementById('zona-pasillo');
      if (!next) return;
      e.preventDefault();
      if (EV.scroll.lenis) {
        var st = EV.zones.get(ID).st;
        EV.scroll.lenis.scrollTo(st.end + 2, { duration: 4.2, easing: sine });
      } else {
        next.scrollIntoView({ behavior: EV.reducedMotion ? 'auto' : 'smooth', block: 'start' });
      }
    });
  }

  /* ---------- ?ajustar=letras ---------- */
  function adjustTool() {
    ['desktop', 'mobile'].forEach(function (v) {
      try { var s = localStorage.getItem(STORE + v); if (s) overrides[v] = JSON.parse(s); } catch (e) {}
    });

    var ui = document.createElement('div');
    ui.className = 'ajuste';
    ui.innerHTML =
      '<svg class="ajuste__marco" aria-hidden="true"><polygon /></svg>' +
      '<div class="ajuste__panel" role="region" aria-label="Ajuste de letras">' +
      '<p class="ajuste__titulo">Letras · <span data-v></span></p>' +
      '<pre class="ajuste__json" data-json></pre>' +
      '<p class="ajuste__estado" data-estado aria-live="polite">Arrastra las esquinas. Flechas: mover 1 px (Mayús: 10).</p>' +
      '<div class="ajuste__acciones"><button type="button" data-copiar>Copiar</button><button type="button" data-reset>Restaurar config</button></div>' +
      '</div>';
    document.body.appendChild(ui);
    var poly = ui.querySelector('polygon');
    var jsonEl = ui.querySelector('[data-json]');
    var estado = ui.querySelector('[data-estado]');
    var vEl = ui.querySelector('[data-v]');

    var handles = [0, 1, 2, 3].map(function (i) {
      var h = document.createElement('button');
      h.type = 'button';
      h.className = 'ajuste__punto';
      h.setAttribute('aria-label', ['Esquina superior izquierda', 'Esquina superior derecha', 'Esquina inferior derecha', 'Esquina inferior izquierda'][i]);
      ui.appendChild(h);
      return h;
    });

    function current() {
      var v = EV.sequence.variant();
      if (!overrides[v]) overrides[v] = corners().map(function (c) { return c.slice(); });
      return overrides[v];
    }
    function text() {
      var v = EV.sequence.variant();
      return v + ': [' + current().map(function (c) { return '[' + c[0].toFixed(4) + ', ' + c[1].toFixed(4) + ']'; }).join(', ') + ']';
    }
    function save(copy) {
      var v = EV.sequence.variant();
      try { localStorage.setItem(STORE + v, JSON.stringify(overrides[v])); } catch (e) {}
      jsonEl.textContent = text();
      if (copy && navigator.clipboard) {
        navigator.clipboard.writeText(text()).then(function () { estado.textContent = 'Copiado al portapapeles. Pégalo en config.fachada.letras.'; },
          function () { estado.textContent = 'No se pudo copiar: selecciona el texto a mano.'; });
      }
    }

    handles.forEach(function (h, i) {
      h.addEventListener('pointerdown', function (e) { h.setPointerCapture(e.pointerId); h.dataset.drag = '1'; e.preventDefault(); });
      h.addEventListener('pointermove', function (e) {
        if (!h.dataset.drag) return;
        current()[i] = EV.sequence.screenToImage(e.clientX, e.clientY);
      });
      h.addEventListener('pointerup', function () { delete h.dataset.drag; save(true); });
      h.addEventListener('keydown', function (e) {
        var step = e.shiftKey ? 10 : 1, dx = 0, dy = 0;
        if (e.key === 'ArrowLeft') dx = -step; else if (e.key === 'ArrowRight') dx = step;
        else if (e.key === 'ArrowUp') dy = -step; else if (e.key === 'ArrowDown') dy = step; else return;
        e.preventDefault();
        var c = current()[i], s = EV.sequence.imageToScreen(c[0], c[1]);
        current()[i] = EV.sequence.screenToImage(s[0] + dx, s[1] + dy);
        save(false);
      });
    });
    ui.querySelector('[data-copiar]').addEventListener('click', function () { save(true); });
    ui.querySelector('[data-reset]').addEventListener('click', function () {
      var v = EV.sequence.variant();
      delete overrides[v];
      try { localStorage.removeItem(STORE + v); } catch (e) {}
      estado.textContent = 'Restaurado desde config.';
      jsonEl.textContent = text();
    });

    gsap.ticker.add(function () {
      vEl.textContent = EV.sequence.variant();
      var pts = current().map(function (c) { return EV.sequence.imageToScreen(c[0], c[1]); });
      pts.forEach(function (p, i) { handles[i].style.transform = 'translate3d(' + p[0].toFixed(1) + 'px,' + p[1].toFixed(1) + 'px,0)'; });
      poly.setAttribute('points', pts.map(function (p) { return p[0].toFixed(1) + ',' + p[1].toFixed(1); }).join(' '));
      if (!jsonEl.textContent) jsonEl.textContent = text();
    });
  }

  EV.zoneScripts[ID] = {
    camera: camera,

    init: function (zone) {
      var stage = zone.stage;
      var copy = stage.querySelector('.fachada__copy');
      var poster = document.querySelector('[data-poster="' + ID + '"]');
      var anchor = poster || document.querySelector('.scene');
      var parts = null;

      wireEnter(stage);
      if (ADJUST) adjustTool();

      if (LOGO && EV.logo) {
        EV.logo.load(LOGO).then(function (svg) {
          parts = buildLetters(svg, anchor);
          ignite(parts.luz);
        }).catch(function (e) { console.warn('[fachada] letras', e); });
      }

      if (EV.mode !== 'cine') return;

      EV.zones.on(ID, function (p) {
        // 0–25 %: el texto se retira (opacidad + leve subida).
        var out = EV.util.range(p, 0.02, 0.22);
        copy.style.opacity = (1 - out).toFixed(3);
        copy.style.transform = 'translate3d(0,' + (-EV.util.range(p, 0, 0.25) * 24).toFixed(2) + 'px,0)';

        if (!parts) return;
        // 85–100 %: el reflejo cian de las letras cruza el cristal y enlaza con la zona 2.
        var t = EV.util.range(p, 0.86, 0.995);
        var vis = t > 0 && t < 1 ? Math.sin(Math.PI * t) : 0;
        parts.reflejo.style.opacity = vis.toFixed(3);
        parts.banda.style.transform = 'translate3d(' + (110 - 200 * sine(t)).toFixed(2) + 'vw,0,0) skewX(-12deg)';
      });

      // Fuera de la fachada, el reflejo nunca se queda colgado.
      document.addEventListener('ev:zone', function (e) {
        if (parts && e.detail.id !== ID) parts.reflejo.style.opacity = '0';
      });
    }
  };
})();
