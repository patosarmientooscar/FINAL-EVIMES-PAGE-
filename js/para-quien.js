/* ==========================================================================
   para-quien.js — #para-quien, "Con quién trabajamos y nuestro trabajo"
   (desde backup-pre-fusion). Script clásico, después de js/recorrido.js.
   · Pestañas (role="tablist"): clic, flechas izquierda/derecha, Inicio y Fin.
     Las dos opciones están en el HTML; la que no toca lleva [hidden] y ocupa
     el mismo sitio (css/para-quien.css): cambiar no mueve el scroll.
   · Iguala el alto de los titulares y de los párrafos de las dos opciones,
     para que la tarjeta del caso quede en el mismo sitio en las dos.
   · Con las pestañas fijas bajo la cabecera, la franja de arriba es gris y
     lisa (.cabecera.is-pestanas).
   ========================================================================== */
(function () {
  var sec = document.querySelector('[data-pq]');
  if (!sec) return;
  var EV = (window.EV = window.EV || {});
  var R = EV.recorrido || null;
  var $$ = function (s, c) { return [].slice.call((c || sec).querySelectorAll(s)); };
  var lista = sec.querySelector('[role="tablist"]'), pestanas = $$('[role="tab"]', lista), paneles = $$('[role="tabpanel"]');
  var cab = document.querySelector('.cabecera');
  var op = 0;

  sec.classList.add('pq-viva');

  /* ---------- las pestañas ---------- */
  function elegir(i, foco) {
    if (i === op) return;
    op = i;
    lista.dataset.v = i;
    pestanas.forEach(function (b, k) { b.setAttribute('aria-selected', String(k === i)); b.tabIndex = k === i ? 0 : -1; });
    paneles.forEach(function (p, k) { p.hidden = k !== i; });
    if (foco) pestanas[i].focus({ preventScroll: true });
  }
  pestanas.forEach(function (b, i) { b.addEventListener('click', function () { elegir(i); }); });
  lista.addEventListener('keydown', function (e) {
    var n = { ArrowRight: op + 1, ArrowLeft: op - 1, Home: 0, End: pestanas.length - 1 }[e.key];
    if (n === undefined) return;
    e.preventDefault();
    elegir((n + pestanas.length) % pestanas.length, true);
  });

  /* ---------- el mismo alto en las dos opciones (la tarjeta no salta) ---------- */
  function igualar() {
    ['.pq-h', '.pq-p'].forEach(function (s) {
      var els = $$(s);
      els.forEach(function (e) { e.style.minHeight = ''; });
      var alto = Math.max.apply(null, els.map(function (e) { return e.offsetHeight; }));
      els.forEach(function (e) { e.style.minHeight = alto + 'px'; });
    });
  }
  igualar();
  addEventListener('resize', igualar);
  if (document.fonts) document.fonts.ready.then(igualar);

  /* ---------- la cabecera: con las pestañas fijas, su franja es gris y lisa ---------- */
  var fijas = null;
  function cabecera() {
    var r = lista.getBoundingClientRect(), s = sec.getBoundingClientRect();
    var on = r.top <= 64 + 1 + (parseFloat(getComputedStyle(lista).top) - 64 || 0) && s.bottom > r.bottom;
    if (on !== fijas && cab) { fijas = on; cab.classList.toggle('is-pestanas', on); }
  }
  if (window.gsap) gsap.ticker.add(cabecera); else addEventListener('scroll', cabecera, { passive: true });

  EV.paraQuien = { elegir: elegir };
})();
