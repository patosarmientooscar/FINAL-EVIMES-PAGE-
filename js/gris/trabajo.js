/* ==========================================================================
   trabajo.js — "Trabajo selecto" + visor (#oficina-slot).
   Datos: js/data/proyectos.js → EVIMES_TRABAJO. Un proyecto sin url o sin
   media no se muestra (el destacado con placeholder: true enseña un hueco
   limpio). ?borradores=1 enseña los borradores para revisar el diseño.
   · Destacado: al entrar el ratón, flash de cámara (80 ms) y se revela el
     vídeo; cursor "Ver"; clic abre la web en otra pestaña.
   · Fila: las cards se encogen y vuelan al centro del visor con el scroll
     (scrub propio sobre el scroll de Lenis, en gsap.ticker).
   · Visor: pantalla grande con marco fino; cuando se monte la oficina será
     su monitor.
   ========================================================================== */
(function () {
  var EV = window.EV;
  var cont = document.querySelector('[data-trabajo-destacado]');
  var fila = document.querySelector('[data-trabajo-fila]');
  var visorEl = document.querySelector('[data-visor]');
  if (!cont || !fila || !visorEl || !EV) return;

  var quieto = !!EV.reducedMotion || /[?&]modo=fijo/.test(location.search);
  var borradores = /[?&]borradores=1/.test(location.search);
  var DATA = window.EVIMES_TRABAJO || [];

  function visible(p) {
    if (p.borrador && !borradores) return false;
    if (p.estado === 'horno') return borradores || !!(p.nombre && p.fecha);
    if (p.destacado && p.placeholder) return true;
    return borradores || !!(p.url && p.media);
  }
  var lista = DATA.filter(visible);
  var destacado = lista.filter(function (p) { return p.destacado; })[0];
  var resto = lista.filter(function (p) { return !p.destacado; });

  function el(tag, cls, html) { var n = document.createElement(tag); if (cls) n.className = cls; if (html != null) n.innerHTML = html; return n; }
  function esc(s) { return String(s || '').replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function dominio(u) { return String(u || '').replace(/^https?:\/\//, '').replace(/\/$/, ''); }
  function tieneMedia(p) { return !!(p.media && !p.placeholder && (p.media.poster || p.media.video)); }

  function videoDe(p) {
    var v = document.createElement('video');
    v.muted = true; v.loop = true; v.playsInline = true; v.preload = 'none';
    v.setAttribute('muted', ''); v.setAttribute('playsinline', ''); v.setAttribute('aria-hidden', 'true');
    if (p.media.poster) v.poster = p.media.poster;
    (p.media.video || []).forEach(function (src) {
      var s = document.createElement('source'); s.src = src; s.type = /\.webm$/.test(src) ? 'video/webm' : 'video/mp4'; v.appendChild(s);
    });
    return v;
  }
  function play(v) { if (!v || quieto) return; var r = v.play(); if (r && r.catch) r.catch(function () {}); }

  /* ---------- flash de cámara (una capa fija, solo opacidad) ---------- */
  var flash = el('div', 'flash');
  flash.setAttribute('aria-hidden', 'true');
  document.body.appendChild(flash);
  var ultimoFlash = 0;
  function disparar() {
    if (quieto || !flash.animate) return;
    var now = performance.now();
    if (now - ultimoFlash < 1200) return;
    ultimoFlash = now;
    flash.animate([{ opacity: 0 }, { opacity: 0.9, offset: 0.35 }, { opacity: 0 }], { duration: 80, easing: 'linear' });
  }

  /* ---------- destacado ---------- */
  var cursor = null, cur = { x: 0, y: 0, tx: 0, ty: 0, on: false };
  if (destacado) {
    var p = destacado, conUrl = !!p.url;
    var card = el(conUrl ? 'a' : 'div', 'destacado' + (conUrl ? '' : ' destacado--sin-url'));
    if (conUrl) { card.href = p.url; card.target = '_blank'; card.rel = 'noopener'; card.setAttribute('aria-label', p.nombre + ': abrir la web en una pestaña nueva'); }
    var media = el('div', 'destacado__media');
    if (tieneMedia(p)) {
      if (p.media.poster) { var img = el('img', 'destacado__poster'); img.src = p.media.poster; img.alt = ''; img.loading = 'lazy'; img.decoding = 'async'; media.appendChild(img); }
      if (p.media.video) { var v = videoDe(p); v.className = 'destacado__video'; media.appendChild(v); card._video = v; }
    } else {
      media.appendChild(el('div', 'destacado__vacio', '<p>Vídeo de la web en camino</p>'));
    }
    card.appendChild(media);
    card.appendChild(el('div', 'destacado__pie',
      '<p class="destacado__tipo">' + esc(p.tipo) + '</p>' +
      '<h3 class="display destacado__nombre">' + esc(p.nombre) + '</h3>' +
      (p.nota ? '<p class="destacado__nota">' + esc(p.nota) + '</p>' : '')));
    cursor = el('span', 'cursor-ver', conUrl ? 'Ver' : 'Pronto');
    cursor.setAttribute('aria-hidden', 'true');
    card.appendChild(cursor);
    cont.appendChild(card);

    card.addEventListener('pointerenter', function (e) {
      if (e.pointerType !== 'mouse') return;
      var r = card.getBoundingClientRect();
      cur.x = cur.tx = e.clientX - r.left; cur.y = cur.ty = e.clientY - r.top; cur.on = true;
      card.classList.add('is-encima');
      disparar();
      if (card._video) { play(card._video); card.classList.add('is-vivo'); }
    });
    card.addEventListener('pointermove', function (e) {
      var r = card.getBoundingClientRect(); cur.tx = e.clientX - r.left; cur.ty = e.clientY - r.top;
    });
    card.addEventListener('pointerleave', function () {
      cur.on = false; card.classList.remove('is-encima', 'is-vivo');
      if (card._video) card._video.pause();
    });
  }

  /* ---------- fila ---------- */
  resto.forEach(function (p) {
    var li = el('li', 'pieza pieza--' + (p.estado === 'horno' ? 'horno' : p.acabado === 'laton' ? 'laton' : 'web'));
    var conUrl = !!p.url && p.estado !== 'horno';
    var a = el(conUrl ? 'a' : 'div', 'pieza__card');
    if (conUrl) { a.href = p.url; a.target = '_blank'; a.rel = 'noopener'; a.setAttribute('aria-label', p.nombre + ': abrir ' + dominio(p.url) + ' en una pestaña nueva'); }
    var marco = el('div', 'pieza__marco');
    var fondo = el('div', 'pieza__fondo');
    if (tieneMedia(p)) {
      if (p.media.poster) { var im = el('img'); im.src = p.media.poster; im.alt = ''; im.loading = 'lazy'; im.decoding = 'async'; fondo.appendChild(im); }
      if (p.media.video && p.estado !== 'horno') { var vv = videoDe(p); fondo.appendChild(vv); a._video = vv; }
    }
    marco.appendChild(fondo);
    if (p.estado === 'horno') {
      marco.appendChild(el('div', 'pieza__cristal'));
      marco.appendChild(el('p', 'pieza__sello', 'En el horno'));
    }
    if (p.acabado === 'laton') {
      marco.appendChild(el('p', 'display pieza__marca', esc(p.nombre)));
      marco.appendChild(el('span', 'pieza__navaja'));
    }
    a.appendChild(marco);
    a.appendChild(el('div', 'pieza__pie',
      '<h3 class="display pieza__nombre">' + esc(p.nombre || 'Proyecto (nombre pendiente)') + '</h3>' +
      '<p class="pieza__meta">' + esc(p.estado === 'horno' ? (p.fecha || 'Fecha pendiente') : (p.url ? dominio(p.url) : (p.tipo || ''))) + '</p>'));
    a.addEventListener('pointerenter', function (e) { if (e.pointerType === 'mouse' && a._video) { play(a._video); a.classList.add('is-vivo'); } });
    a.addEventListener('pointerleave', function () { if (a._video) { a._video.pause(); a.classList.remove('is-vivo'); } });
    li.appendChild(a);
    fila.appendChild(li);
  });
  if (!resto.length) fila.hidden = true;
  fila.dataset.n = String(resto.length);

  /* ---------- visor ---------- */
  var enVisor = lista.filter(function (p) { return p.estado !== 'horno'; })
    .sort(function (a, b) { return (tieneMedia(b) ? 1 : 0) - (tieneMedia(a) ? 1 : 0); });
  var vi = 0, visorVisible = false;
  var rotulo = document.querySelector('[data-visor-rotulo]');
  var capas = enVisor.map(function (p, i) {
    var c = el('figure', 'visor__capa' + (i === 0 ? ' is-activa' : ''));
    if (tieneMedia(p)) {
      if (p.media.poster) { var im = el('img'); im.src = p.media.poster; im.alt = 'Captura de ' + p.nombre; im.loading = 'lazy'; im.decoding = 'async'; c.appendChild(im); }
      if (p.media.video) { var v = videoDe(p); c.appendChild(v); c._video = v; }
    } else c.appendChild(el('div', 'visor__vacio', '<p class="display">' + esc(p.nombre) + '</p><p>Vídeo de la web en camino</p>'));
    visorEl.appendChild(c);
    return c;
  });
  function pintaRotulo() {
    var p = enVisor[vi];
    if (!p) { rotulo.textContent = ''; return; }
    rotulo.innerHTML = '<span class="visor__num">' + String(vi + 1).padStart(2, '0') + ' / ' + String(enVisor.length).padStart(2, '0') + '</span> ' +
      esc(p.nombre) + (p.url ? ' · <a class="enlace enlace--oscuro" href="' + esc(p.url) + '" target="_blank" rel="noopener">' + esc(dominio(p.url)) + ' ↗</a>' : '');
  }
  function mostrar(i) {
    if (!capas.length) return;
    var prev = capas[vi];
    vi = (i + capas.length) % capas.length;
    capas.forEach(function (c, j) { c.classList.toggle('is-activa', j === vi); if (c._video && j !== vi) c._video.pause(); });
    if (visorVisible) play(capas[vi]._video);
    pintaRotulo();
  }
  var bp = document.querySelector('[data-visor-prev]'), bn = document.querySelector('[data-visor-next]');
  if (capas.length < 2) { bp.hidden = bn.hidden = true; }
  bp.addEventListener('click', function () { mostrar(vi - 1); });
  bn.addEventListener('click', function () { mostrar(vi + 1); });
  pintaRotulo();
  var slot = document.querySelector('[data-oficina-slot]');
  if ('IntersectionObserver' in window && slot) {
    new IntersectionObserver(function (es) {
      visorVisible = es[0].isIntersecting;
      var v = capas[vi] && capas[vi]._video;
      if (visorVisible) play(v); else if (v) v.pause();
    }, { threshold: 0.35 }).observe(slot);
  }

  /* ---------- vuelo de la fila al visor (scrub con el scroll) ---------- */
  var piezas = Array.prototype.slice.call(fila.querySelectorAll('.pieza'));
  var L = { ok: false };
  function medir() {
    if (!slot) return;
    var y = EV.home ? EV.home.scrollY() : window.scrollY;
    var vh = window.innerHeight;
    var rs = slot.querySelector('.visor__marco').getBoundingClientRect();
    var rf = fila.getBoundingClientRect();
    L.vx = rs.left + rs.width / 2; L.vy = rs.top + rs.height / 2 + y;
    L.y0 = rf.top + y - vh * 0.22;                                   // la fila sube hacia arriba…
    L.y1 = rs.top + rs.height / 2 + y - vh * 0.5;                    // …y el visor queda centrado
    L.d = piezas.map(function (n) {
      n.style.transform = '';
      var r = n.getBoundingClientRect();
      return { x: L.vx - (r.left + r.width / 2), y: L.vy - (r.top + r.height / 2 + y) };
    });
    L.ok = L.y1 > L.y0 + 50;
    L.last = -1;
  }
  function vuelo() {
    if (!L.ok || quieto || !piezas.length) return;
    var y = EV.home ? EV.home.scrollY() : window.scrollY;
    var q = Math.max(0, Math.min(1, (y - L.y0) / (L.y1 - L.y0)));
    if (Math.abs(q - L.last) < 0.0005) return;
    L.last = q;
    var e = q * q * (3 - 2 * q);
    piezas.forEach(function (n, i) {
      var d = L.d[i], s = 1 - 0.82 * e;
      n.style.transform = q > 0 ? 'translate3d(' + (d.x * e).toFixed(1) + 'px,' + (d.y * e).toFixed(1) + 'px,0) scale(' + s.toFixed(3) + ')' : '';
      n.style.opacity = q > 0.72 ? Math.max(0, 1 - (q - 0.72) / 0.26).toFixed(3) : '';
    });
    fila.classList.toggle('is-volando', q > 0.02);
    if (slot) slot.classList.toggle('is-recibe', q > 0.96);
  }

  /* ---------- bucle (gsap.ticker) ---------- */
  function tick(time, dtMs) {
    if (cursor && cur.on) {
      var k = 1 - Math.pow(1 - 0.22, (dtMs || 16.7) / 16.7);
      cur.x += (cur.tx - cur.x) * k; cur.y += (cur.ty - cur.y) * k;
      cursor.style.transform = 'translate3d(' + cur.x.toFixed(1) + 'px,' + cur.y.toFixed(1) + 'px,0) translate(-50%,-50%)';
    }
    vuelo();
  }
  function init() {
    medir();
    window.addEventListener('resize', medir);
    if (window.ResizeObserver) new ResizeObserver(function () { medir(); }).observe(document.body);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(medir);
    if (window.gsap) gsap.ticker.add(tick);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
