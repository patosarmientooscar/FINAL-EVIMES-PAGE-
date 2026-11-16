/* ==========================================================================
   clientes.js — "¿Con quién trabajamos?": interruptor de cromo de dos
   posiciones (tablist accesible, flechas del teclado) que transforma el
   contenido: fundido + las líneas suben una a una (0,5 s). Al cambiar, los
   tubos del fondo hacen un pulso (EV.onda.pulso).
   Datos (BORRADOR): js/data/clientes.js.
   ========================================================================== */
(function () {
  var EV = window.EV;
  var sw = document.querySelector('[data-interruptor]');
  var cont = document.querySelector('[data-clientes]');
  var DATA = window.EVIMES_CLIENTES || [];
  if (!sw || !cont || DATA.length < 2) return;
  var quieto = !!(EV && EV.reducedMotion) || /[?&]modo=fijo/.test(location.search);

  function esc(s) { return String(s || '').replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }

  sw.innerHTML = '<span class="interruptor__mando" aria-hidden="true"></span>' + DATA.map(function (d, i) {
    return '<button type="button" role="tab" class="interruptor__op" id="tab-' + d.id + '" aria-controls="panel-' + d.id + '" aria-selected="' + (i === 0) + '"' + (i ? ' tabindex="-1"' : '') + '>' + esc(d.pestana) + '</button>';
  }).join('');
  cont.innerHTML = DATA.map(function (d, i) {
    return '<div class="cliente cliente--' + d.id + (i === 0 ? ' is-activo' : '') + '" role="tabpanel" id="panel-' + d.id + '" aria-labelledby="tab-' + d.id + '"' + (i ? ' hidden' : '') + ' tabindex="0">' +
      '<p class="display cliente__titulo">' + d.titulo.map(function (l) { return '<span class="cliente__linea"><span>' + esc(l) + '</span></span>'; }).join(' ') + '</p>' +
      '<p class="cliente__texto sube">' + esc(d.texto) + '</p>' +
      '<ul class="cliente__puntos">' + d.puntos.map(function (p) { return '<li class="sube">' + esc(p) + '</li>'; }).join('') + '</ul>' +
      '<a class="pastilla pastilla--grande cliente__cta sube" href="#contacto" data-asunto="' + esc(d.asunto) + '">' + esc(d.cta) + '</a>' +
      '</div>';
  }).join('');

  var tabs = Array.prototype.slice.call(sw.querySelectorAll('[role="tab"]'));
  var paneles = Array.prototype.slice.call(cont.querySelectorAll('[role="tabpanel"]'));
  var actual = 0;

  function colocarMando() {
    var t = tabs[actual], m = sw.querySelector('.interruptor__mando');
    m.style.width = t.offsetWidth + 'px';
    m.style.transform = 'translateX(' + t.offsetLeft + 'px)';
  }

  function elegir(i, foco) {
    if (i === actual) { if (foco) tabs[i].focus(); return; }
    var sale = paneles[actual], entra = paneles[i];
    tabs.forEach(function (t, j) { t.setAttribute('aria-selected', String(j === i)); t.tabIndex = j === i ? 0 : -1; });
    actual = i;
    sw.dataset.pos = String(i);
    colocarMando();
    if (foco) tabs[i].focus();
    if (EV && EV.onda && EV.onda.pulso) EV.onda.pulso(0.05);
    if (quieto) { sale.hidden = true; sale.classList.remove('is-activo'); entra.hidden = false; entra.classList.add('is-activo'); return; }
    // Fundido cruzado: los dos paneles en la misma celda de la rejilla.
    sale.classList.add('is-saliendo'); sale.classList.remove('is-activo');
    entra.hidden = false;
    void entra.offsetWidth;                                       // reinicia las transiciones de entrada
    entra.classList.add('is-activo');
    setTimeout(function () { sale.hidden = true; sale.classList.remove('is-saliendo'); }, 420);
  }

  tabs.forEach(function (t, i) { t.addEventListener('click', function () { elegir(i); }); });
  sw.addEventListener('keydown', function (e) {
    var i = null;
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') i = (actual + 1) % tabs.length;
    else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') i = (actual - 1 + tabs.length) % tabs.length;
    else if (e.key === 'Home') i = 0; else if (e.key === 'End') i = tabs.length - 1;
    if (i === null) return;
    e.preventDefault(); elegir(i, true);
  });
  // El asunto del correo según el tipo de cliente.
  cont.addEventListener('click', function (e) {
    var a = e.target.closest('[data-asunto]');
    if (!a) return;
    var p = document.querySelector('[data-propuesta]');
    if (p) p.href = 'mailto:' + ((window.EVIMES_CONFIG && EVIMES_CONFIG.email) || 'evimes@evimesweb.com') + '?subject=' + encodeURIComponent(a.dataset.asunto);
  });

  function init() {
    sw.dataset.pos = '0';
    colocarMando();
    window.addEventListener('resize', colocarMando);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(colocarMando);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
