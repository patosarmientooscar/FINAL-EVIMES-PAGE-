/* ==========================================================================
   home.js — la home. Un único bucle: gsap.ticker.
     1. Lenis.raf                 (prioritario)
     2. tick(): scroll → cabecera (fundido al bajar; clara sobre el gris)
     3. las dos ondas, la red del hero y las secciones laterales (js/ondas.js, js/red.js, js/recorrido.js: cada una su callback en el mismo ticker)
   Desde backup-pre-ondas la home no lleva los tubos (js/fondo/onda.js sigue en
   las demás páginas): las ondas se importan con import() en un momento libre
   tras el primer pintado. Versión fija (EV.mode === 'still'): sin Lenis; con
   movimiento reducido las ondas se quedan quietas en la firma; con ahorro de
   datos o conexión lenta no se cargan.
   ========================================================================== */
(function () {
  var EV = window.EV;
  var U = EV.util;
  var cfg = window.EVIMES_CONFIG || {};
  var cine = EV.mode === 'cine';
  var root = document.documentElement;

  var $ = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };

  var el = { cab: $('.cabecera') };
  var lenis = null;
  var vw = 0, vh = 0;
  var lay = {};                           // posiciones cacheadas (se recalculan al cambiar el tamaño)
  var cabClara = null, ultimaY = -1;

  /* ---------- textos desde js/content.js ---------- */
  function bindContent() {
    $$('[data-c]').forEach(function (n) {
      var v = U.content(n.dataset.c);
      if (typeof v === 'string' && n.textContent !== v) n.textContent = v;
    });
  }

  function scrollY() { return lenis ? lenis.scroll : window.scrollY; }

  function measure() {
    vw = window.innerWidth; vh = window.innerHeight;
    var y = scrollY();
    // Secciones grises normales (#para-quien). #lateral avisa ella (EV.cabeceraClara, js/recorrido.js): su gris se mueve.
    lay.grises = $$('.panel, [data-nav="light"]').map(function (n) { var r = n.getBoundingClientRect(); return { top: r.top + y, bottom: r.bottom + y }; });
    // islas oscuras dentro del gris (la ventana del caso de #para-quien): ahí, cristal oscuro. Las de un público oculto no cuentan.
    lay.oscuras = $$('[data-nav="dark"]').map(function (n) { var r = n.getBoundingClientRect(); return { n: n, top: r.top + y, bottom: r.bottom + y }; });
    var c = el.cab.getBoundingClientRect();
    lay.cabTop = c.top; lay.cabBottom = c.bottom;
    ultimaY = -1;
  }

  /* ---------- Lenis en gsap.ticker ---------- */
  function scrollInit() {
    if (!cine || typeof Lenis === 'undefined') return;
    lenis = new Lenis({
      duration: 1.15,
      easing: function (t) { return Math.min(1, 1.001 - Math.pow(2, -10 * t)); },
      smoothWheel: true,
      autoRaf: false
    });
    gsap.ticker.add(function (time) { lenis.raf(time * 1000); }, false, true);
    gsap.ticker.lagSmoothing(0);
  }

  function ir(id) {
    var t = document.getElementById(id);
    if (!t) return;
    if (EV.recorrido) EV.recorrido.preparar();   // su alto es el definitivo antes de calcular el destino
    // Mientras dura el salto, la oficina no arranca su visita automática al cruzarla (EV.home.saltando).
    EV.saltando = true;
    var fin = function () { EV.saltando = false; };
    var off = id === 'inicio' ? 0 : -Math.round((el.cab ? el.cab.getBoundingClientRect().bottom : 80) + 16);
    var yT = 0, m = t; while (m) { yT += m.offsetTop; m = m.offsetParent; }
    var propio = EV.recorrido ? EV.recorrido.destino(id) : null;   // #lateral abierta; #para-quien, ya descubierta por la persiana
    var destino = propio !== null ? propio : Math.max(0, yT + off);
    if (lenis) lenis.scrollTo(id === 'inicio' ? 0 : destino, { duration: Math.min(2.2, 0.8 + Math.abs(t.getBoundingClientRect().top) / 4000), onComplete: fin });
    else if (propio !== null) { window.scrollTo({ top: destino, behavior: EV.reducedMotion ? 'auto' : 'smooth' }); setTimeout(fin, 1200); }
    else { t.scrollIntoView({ behavior: EV.reducedMotion ? 'auto' : 'smooth' }); setTimeout(fin, 1200); }
    setTimeout(fin, 2600);
    if (id !== 'inicio') {
      if (!t.hasAttribute('tabindex')) t.setAttribute('tabindex', '-1');
      setTimeout(function () { t.focus({ preventScroll: true }); }, lenis ? 900 : 50);
    }
  }

  /* ---------- cabecera: menú móvil + anclas ---------- */
  function cabecera() {
    var btn = $('.cabecera__abrir');
    function abrir(on) { el.cab.classList.toggle('is-abierta', on); btn.setAttribute('aria-expanded', String(on)); }
    btn.addEventListener('click', function () { abrir(btn.getAttribute('aria-expanded') !== 'true'); });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && el.cab.classList.contains('is-abierta')) { abrir(false); btn.focus(); }
    });
    document.addEventListener('click', function (e) {
      var a = e.target.closest('a[href^="#"]');
      if (!a) return;
      var id = a.getAttribute('href').slice(1);
      if (!id || !document.getElementById(id)) return;
      e.preventDefault();
      abrir(false);
      if (a.dataset.plan) elegirPlan(a.dataset.plan);
      ir(id);
      if (history.replaceState) history.replaceState(null, '', '#' + id);
    });
  }

  /* ---------- herramientas: segunda copia para el bucle infinito ---------- */
  function herramientas() {
    var lista = $('[data-herramientas]');
    // Solo se queda quieta con movimiento reducido (o ?modo=fijo), no por conexión lenta.
    if (EV.reducedMotion || /[?&]modo=fijo/.test(location.search)) return;
    var copia = lista.cloneNode(true);
    copia.setAttribute('aria-hidden', 'true');
    copia.removeAttribute('data-herramientas');
    lista.parentNode.appendChild(copia);
    root.classList.add('cinta-viva');
  }

  /* ---------- planes (js/data/planes.js) ---------- */
  function planes() {
    var ol = $('[data-planes]');
    var txt = U.content('inicio.planes') || {};
    (window.EVIMES_PLANES || []).forEach(function (p, i) {
      var li = document.createElement('li');
      li.className = 'plan' + (p.recomendado ? ' plan--rec' : '');
      li.style.setProperty('--i', i);
      var m = /^desde\s+(.*)$/i.exec(p.precio);
      var precio = m
        ? '<span class="plan__desde">' + (txt.desde || 'desde') + '</span>' + m[1].replace(' €', '&nbsp;€')
        : p.precio.replace(' €', '&nbsp;€');
      li.innerHTML =
        (p.recomendado ? '<p class="plan__marca">' + (txt.recomendado || 'Recomendado') + '</p>' : '') +
        '<h3 class="display plan__nombre"></h3>' +
        '<p class="plan__para"></p>' +
        '<p class="display plan__precio">' + precio + '</p>' +
        '<ul class="plan__incluye"></ul>' +
        (p.unica ? '<p class="plan__unica"></p>' : '') +
        '<a class="pastilla plan__boton' + (p.recomendado ? '' : ' pastilla--linea') + '" href="#contacto"></a>';
      $('.plan__nombre', li).textContent = p.nombre;
      $('.plan__para', li).textContent = p.para;
      var ul = $('.plan__incluye', li);
      p.incluye.forEach(function (x) { var it = document.createElement('li'); it.textContent = x; ul.appendChild(it); });
      if (p.unica) $('.plan__unica', li).textContent = p.unica;
      var b = $('.plan__boton', li);
      b.innerHTML = '<span class="sl"></span>';
      b.firstChild.textContent = p.boton;
      b.setAttribute('data-scramble', '');
      b.dataset.plan = p.id;
      b.setAttribute('aria-label', p.boton + ': plan ' + p.nombre);
      // Brillo cian que sigue al ratón por el borde.
      li.addEventListener('pointermove', function (e) {
        var r = li.getBoundingClientRect();
        li.style.setProperty('--mx', (e.clientX - r.left) + 'px');
        li.style.setProperty('--my', (e.clientY - r.top) + 'px');
      });
      ol.appendChild(li);
    });
    // Entrada escalonada (una vez).
    var items = $$('.plan', ol);
    if (!cine || !('IntersectionObserver' in window)) { items.forEach(function (n) { n.classList.add('is-dentro'); }); return; }
    root.classList.add('planes-vivos');
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        if (!e.isIntersecting) return;
        items.forEach(function (n) { n.classList.add('is-dentro'); });
        io.disconnect();
      });
    }, { threshold: 0.18 });
    io.observe(ol);
  }

  /* ---------- contacto ----------
     El formulario es js/contacto/form.js. Aquí solo: el plan elegido en una
     card de plan se preselecciona en el formulario, y los enlaces directos
     (WhatsApp, email, teléfono) salen de js/config.js; vacíos, no se muestran. */
  function elegirPlan(id) { if (EV.form && EV.form.plan) EV.form.plan(id); }
  function contacto() {
    var hay = false, cont = $('[data-directo]');
    var wa = $('[data-whatsapp]'), em = $('[data-email]'), tel = $('[data-telefono]');
    if (wa && cfg.whatsapp) { wa.href = 'https://wa.me/' + cfg.whatsapp; wa.hidden = false; hay = true; }
    if (em && cfg.email) { em.href = 'mailto:' + cfg.email; em.textContent = cfg.email; em.hidden = false; hay = true; }
    if (tel && cfg.telefono) { tel.href = cfg.telefonoHref || ('tel:' + cfg.telefono.replace(/\s/g, '')); tel.textContent = cfg.telefono; tel.hidden = false; hay = true; }
    if (cont) cont.hidden = !hay;
  }

  /* ---------- estado por scroll (sin lecturas de layout por fotograma) ---------- */
  function estado(y) {
    if (y === ultimaY) return;
    ultimaY = y;
    // Cabecera clara cuando una sección gris pasa por su línea central.
    // Sobre la oficina (js/oficina/), cristal oscuro: la oficina pone EV.cabeceraOscura.
    var mid = (lay.cabTop + lay.cabBottom) / 2, dentro = false;
    for (var i = 0; i < lay.grises.length; i++) {
      var t = lay.grises[i].top - y, b = lay.grises[i].bottom - y;
      if (t < mid && b > mid) dentro = true;
    }
    for (i = 0; i < lay.oscuras.length; i++) {
      var o = lay.oscuras[i];
      if (!EV.cabeceraGris && o.top - y < mid && o.bottom - y > mid && !o.n.closest('[hidden]')) dentro = false;
    }
    // EV.cabeceraGris: la franja gris del título fijo de #para-quien está debajo (js/para-quien.js)
    var clara = (dentro || !!EV.cabeceraClara || !!EV.cabeceraGris) && !EV.cabeceraOscura;
    if (clara !== cabClara) { cabClara = clara; el.cab.classList.toggle('is-clara', clara); }

    var scrolled = y > 40;
    if (el.cab._s !== scrolled) { el.cab._s = scrolled; el.cab.classList.toggle('is-scroll', scrolled); }
  }
  function tick() { estado(scrollY()); }
  function refrescar() { ultimaY = -1; tick(); }

  /* ---------- las dos ondas (js/ondas.js) ----------
     import() en el primer momento libre tras la carga (requestIdleCallback; sin él,
     a los 1,5 s). El montaje va troceado (EV.gpu): no bloquea el hilo. Al aparecer,
     forman la firma (con su destello) y a los 2,6 s el hero pasa a la hélice. */
  function ondas() {
    if (!document.getElementById('ondas')) return;
    if (EV.lenta || /[?&]modo=fijo/.test(location.search)) return;     // ahorro de datos / 2G-3G / versión fija forzada
    if (EV.mode !== 'cine' && !EV.reducedMotion) return;
    var go = function () {
      // la red del hero: solo escucha; su WebGL espera al primer gesto sobre el hero
      if (cine) import('./red.js').catch(function (e) { console.warn('[red] no carga', e); });
      import('./ondas.js').then(function (m) { return m.listo; }).then(function (api) {
        if (!api || EV.reducedMotion) return;
        var escena = document.getElementById('heroStage');
        if (escena) setTimeout(function () { escena.dataset.ondas = 'helice'; }, 2600);
      }).catch(function (e) { console.warn('[ondas] no cargan', e); });
    };
    var enReposo = function () {
      if ('requestIdleCallback' in window) requestIdleCallback(go, { timeout: 3000 });
      else setTimeout(go, 1500);
    };
    if (document.readyState === 'complete') enReposo(); else window.addEventListener('load', enReposo, { once: true });
  }

  /* ---------- arranque ---------- */
  function boot() {
    if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
    bindContent();
    scrollInit();
    cabecera();
    herramientas();
    planes();
    contacto();
    measure();

    var re = function () { measure(); };
    window.addEventListener('resize', re);
    if (window.ResizeObserver) new ResizeObserver(re).observe(document.body);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(re);

    if (cine) gsap.ticker.add(tick);
    else {
      window.addEventListener('scroll', tick, { passive: true });
      window.addEventListener('resize', function () { measure(); tick(); });
      tick();
    }
    ondas();

    var h = location.hash.slice(1);
    if (h && document.getElementById(h)) setTimeout(function () { ir(h); }, 80);
    // API mínima para los módulos del panel gris (js/gris/*): mismo scroll, mismo bucle.
    EV.home = { scrollY: scrollY, get lenis() { return lenis; }, get saltando() { return !!EV.saltando; }, cine: cine, ir: ir, refrescar: refrescar, elegirPlan: elegirPlan };
    root.classList.add('is-ready');
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
