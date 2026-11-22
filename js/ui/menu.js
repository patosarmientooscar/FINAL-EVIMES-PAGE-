/* ==========================================================================
   ui/menu.js — la cabecera en las páginas de texto (legales): abre y cierra
   el menú móvil ("Menú") y pone is-scroll (el fundido bajo la cabecera). En la
   home y en las páginas con el fondo global lo hacen js/home.js y
   js/fondo/fondo.js.
   ========================================================================== */
(function () {
  var cab = document.querySelector('.cabecera');
  if (!cab) return;
  var btn = cab.querySelector('.cabecera__abrir');
  function abrir(on) { cab.classList.toggle('is-abierta', on); if (btn) btn.setAttribute('aria-expanded', String(on)); }
  if (btn) btn.addEventListener('click', function () { abrir(btn.getAttribute('aria-expanded') !== 'true'); });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && cab.classList.contains('is-abierta')) { abrir(false); if (btn) btn.focus(); }
  });
  var s = null;
  function scroll() { var v = window.scrollY > 40; if (v !== s) { s = v; cab.classList.toggle('is-scroll', v); } }
  window.addEventListener('scroll', scroll, { passive: true });
  scroll();
})();
