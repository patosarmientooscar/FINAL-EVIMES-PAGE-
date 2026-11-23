/* ==========================================================================
   para-quien.js — #para-quien, "Con quién trabajamos y nuestro trabajo"
   (desde backup-pre-para-quien; prototipo aprobado Downloads/evimes-para-quien).
   Script clásico, después de js/recorrido.js.
   · LA FRASE ES EL INTERRUPTOR: los dos públicos son <button aria-pressed>;
     clic o flechas izquierda/derecha. Por defecto, agencias.
   · Los dos públicos están en el HTML (el que no toca, con hidden, maquetado
     encima y fuera del flujo: css/para-quien.css): cambiar no mueve el scroll.
     Aquí se iguala el alto de sus dos columnas, para que las ventanas empiecen
     a la misma altura; al cambiar, Lenis se entera del alto nuevo.
   ========================================================================== */
(function () {
  var sec = document.querySelector('[data-pq]');
  if (!sec) return;
  var EV = (window.EV = window.EV || {});
  var $$ = function (s, c) { return [].slice.call((c || sec).querySelectorAll(s)); };
  var botones = $$('.pq-aud'), paneles = $$('[data-aud]'), frase = sec.querySelector('.pq-switch');
  var aud = 'ag';

  sec.classList.add('pq-viva');

  function aplicar(n) {
    aud = n;
    paneles.forEach(function (p) { p.hidden = p.dataset.aud !== n; });
    sec.dataset.active = n;
    if (EV.home && EV.home.lenis) EV.home.lenis.resize();
  }
  function elegir(n, foco) {
    botones.forEach(function (b) { b.setAttribute('aria-pressed', String(b.dataset.for === n)); });
    if (foco) botones.filter(function (b) { return b.dataset.for === n; })[0].focus({ preventScroll: true });
    if (n !== aud) aplicar(n);
  }
  botones.forEach(function (b) { b.addEventListener('click', function () { elegir(b.dataset.for); }); });
  frase.addEventListener('keydown', function (e) {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
    e.preventDefault();
    elegir(aud === 'ag' ? 'nl' : 'ag', true);
  });

  function igualar() {
    ['.pq-talk'].forEach(function (s) {
      var els = $$(s);
      els.forEach(function (e) { e.style.minHeight = ''; });
      var alto = Math.max.apply(null, els.map(function (e) { return e.offsetHeight; }));
      els.forEach(function (e) { e.style.minHeight = alto + 'px'; });
    });
  }
  igualar();
  addEventListener('resize', igualar);
  if (document.fonts) document.fonts.ready.then(igualar);

  EV.paraQuien = { elegir: elegir, medir: igualar };
})();
