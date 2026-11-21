/* ==========================================================================
   que-hacemos.js — "Qué hacemos" en la home (desde backup-pre-ondas).
   Prototipo aprobado: Downloads/evimes-home-ondas. Sección gris alta con un
   panel fijo (css/que-hacemos.css): un tramo de scroll por servicio.
   · Índice activo = progreso del scroll en la sección (posiciones cacheadas,
     se miden solo al cambiar el tamaño), en cuartos, con una histéresis del
     5 % del tramo. Dentro de gsap.ticker, el bucle único de la web.
   · Cambio: el texto entrante, palabra a palabra (máscara, 55 ms entre
     palabras, desenfoque que se aclara; brillo en la cursiva); la descripción
     y las etiquetas después. El saliente sube y se desvanece (clases .is-on /
     .is-out; las transiciones están en el CSS).
   · Las ondas (js/ondas.js): cada servicio con su movimiento en el ancla
     .qh__stage (data-m → EvimesOndas.setStepMotion).
   · Clic (o Enter) en un título: Lenis.scrollTo (1,1 s) al centro de su tramo.
     Flechas arriba/abajo (izquierda/derecha en móvil): el servicio siguiente.
   · Sin JS, movimiento reducido o versión fija (EV.mode 'still'): los 4 en
     lista (el CSS), sin pestañas.
   ========================================================================== */
(function () {
  var EV = window.EV || {};
  var raiz = document.querySelector('[data-qh]');
  if (!raiz) return;
  var tabs = [].slice.call(raiz.querySelectorAll('[role="tab"]'));
  var panes = tabs.map(function (t) { return document.getElementById(t.getAttribute('aria-controls')); });
  var N = panes.length;

  // Versión fija / movimiento reducido: lista, sin pestañas (las ondas, quietas en su ancla).
  if (EV.mode !== 'cine') {
    panes.forEach(function (p) { p.removeAttribute('role'); p.removeAttribute('aria-labelledby'); });
    return;
  }

  var pin = raiz.querySelector('.qh__pin');
  var fila = raiz.querySelector('.qh__titulos');
  var stage = document.getElementById('qhStage');
  var num = raiz.querySelector('.qh__n');
  var barras = tabs.map(function (t) { return t.querySelector('i'); });
  var estrecha = matchMedia('(max-width: 860px)');
  var activo = 0, bloqueo = 0, ultimaY = -1;
  var lay = { inicio: 0, recorrido: 1 };

  /* ---------- palabras con máscara (el texto sigue en el HTML) ---------- */
  panes.forEach(function (p) {
    var h = p.querySelector('h3'), n = 0;
    var envolver = function (texto, padre) {
      texto.split(/(\s+)/).forEach(function (t) {
        if (!t) return;
        if (/^\s+$/.test(t)) { padre.appendChild(document.createTextNode(' ')); return; }
        var w = document.createElement('span'), i = document.createElement('span');
        w.className = 'w'; i.textContent = t; i.style.transitionDelay = (n++ * 55) + 'ms';
        w.appendChild(i); padre.appendChild(w);
      });
    };
    [].slice.call(h.childNodes).forEach(function (c) {
      if (c.nodeType === 3) { var fr = document.createDocumentFragment(); envolver(c.textContent, fr); h.replaceChild(fr, c); }
      else { var t = c.textContent; c.textContent = ''; envolver(t, c); }
    });
    h.setAttribute('aria-label', h.textContent.replace(/\s+/g, ' ').trim());   // el lector lee la frase, no palabra a palabra
  });
  panes.forEach(function (p, k) { p.inert = k !== 0; });

  /* ---------- medidas (solo al cambiar el tamaño) ---------- */
  function medir() {
    var y = 0, n = raiz; while (n) { y += n.offsetTop; n = n.offsetParent; }
    lay.inicio = y;                                               // el panel se queda fijo arriba (top: 0)
    lay.recorrido = Math.max(1, raiz.offsetHeight - pin.offsetHeight);
    ultimaY = -1;
  }
  medir();
  addEventListener('resize', medir);
  if (window.ResizeObserver) new ResizeObserver(medir).observe(document.body);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(medir);

  var lenis = function () { return (EV.home && EV.home.lenis) || null; };
  var scrollY = function () { var l = lenis(); return l ? l.scroll : window.scrollY; };

  /* ---------- las ondas: el movimiento del servicio activo ---------- */
  function ondas() { if (window.EvimesOndas && stage) window.EvimesOndas.setStepMotion(stage, tabs[activo].dataset.m); }
  ondas();
  addEventListener('ondas:listo', ondas);

  /* ---------- el cambio ---------- */
  function mostrar(i) {
    if (i === activo) return;
    var a = panes[activo], b = panes[i];
    barras[activo].style.transform = '';
    a.classList.remove('is-on'); a.classList.add('is-out'); a.inert = true;
    setTimeout(function () { a.classList.remove('is-out'); }, 700);
    b.classList.remove('is-out'); b.inert = false;
    void b.offsetWidth;
    setTimeout(function () { b.classList.add('is-on'); }, 30);
    tabs.forEach(function (t, k) { t.setAttribute('aria-selected', String(k === i)); t.tabIndex = k === i ? 0 : -1; });
    if (num) num.textContent = ('0' + (i + 1)).slice(-2) + ' / ' + ('0' + N).slice(-2);
    activo = i;
    ondas();
    if (estrecha.matches) {                                         // en móvil, el título activo siempre a la vista
      var t = tabs[i], x = t.offsetLeft - (fila.clientWidth - t.offsetWidth) / 2;
      fila.scrollTo({ left: Math.max(0, x), behavior: 'smooth' });
    }
  }

  /* ---------- estado por scroll ---------- */
  function tick() {
    var y = scrollY();
    if (y === ultimaY) return;
    ultimaY = y;
    var p = Math.min(1, Math.max(0, (y - lay.inicio) / lay.recorrido));
    var f = Math.min(N - 1e-4, p * N);
    if (!bloqueo) {
      var H = 0.05;                                                 // histéresis: 5 % del tramo
      if (f < activo - H || f >= activo + 1 + H) mostrar(Math.min(N - 1, Math.max(0, Math.floor(f))));
    }
    if (!estrecha.matches) {
      var s = 'scaleY(' + Math.min(1, Math.max(0, f - activo)).toFixed(4) + ')';
      if (barras[activo].style.transform !== s) barras[activo].style.transform = s;
    }
  }

  /* ---------- clic y teclado ---------- */
  function ir(i) {
    var destino = Math.round(lay.inicio + lay.recorrido * (i + 0.5) / N);  // el centro de su tramo
    clearTimeout(bloqueo);
    mostrar(i);
    var fin = function () { clearTimeout(bloqueo); bloqueo = 0; ultimaY = -1; };
    bloqueo = setTimeout(fin, 1400);
    var l = lenis();
    if (l) l.scrollTo(destino, { duration: 1.1, easing: function (t) { return 1 - Math.pow(1 - t, 4); }, onComplete: fin });
    else window.scrollTo({ top: destino, behavior: 'smooth' });
  }
  tabs.forEach(function (t, i) { t.addEventListener('click', function () { ir(i); }); });
  fila.addEventListener('keydown', function (e) {
    var k = tabs.indexOf(document.activeElement);
    if (k < 0) return;
    var sig = { ArrowDown: 1, ArrowRight: 1, ArrowUp: -1, ArrowLeft: -1 }[e.key], n = -1;
    if (sig) n = (k + sig + N) % N; else if (e.key === 'Home') n = 0; else if (e.key === 'End') n = N - 1;
    if (n < 0) return;
    e.preventDefault();
    tabs[n].click();
    tabs[n].focus({ preventScroll: true });
  });
  // un gesto del usuario suelta el bloqueo del salto (si lo interrumpe, manda el scroll)
  ['wheel', 'touchstart'].forEach(function (ev) {
    addEventListener(ev, function () { if (bloqueo) { clearTimeout(bloqueo); bloqueo = 0; ultimaY = -1; } }, { passive: true });
  });

  // El primer servicio entra (palabra a palabra) cuando la sección llega a la pantalla.
  var p0 = panes[0];
  p0.classList.remove('is-on');
  new IntersectionObserver(function (es, o) {
    if (!es[0].isIntersecting) return;
    o.disconnect();
    if (activo === 0) p0.classList.add('is-on');
  }, { threshold: 0.25 }).observe(pin);

  if (window.gsap) gsap.ticker.add(tick);
  else (function f() { requestAnimationFrame(f); tick(); })();
})();
