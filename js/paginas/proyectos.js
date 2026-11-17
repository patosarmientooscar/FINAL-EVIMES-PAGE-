/* ==========================================================================
   paginas/proyectos.js — proyectos.html (dos ejemplos, uno por tipo de cliente).
   · La vista de cada web: si hay vídeo (js/data/proyectos.js → casos.*.video),
     un <video> muted loop playsinline en la card de cristal con filo de cromo,
     que solo corre en pantalla (IO) y se queda en el póster con movimiento
     reducido. Sin vídeo: la captura que hace scroll sola (Disco) o una card
     de espera (León's). Con url, la card abre la web en otra pestaña.
   · Disco: los 4 indicadores de PageSpeed (js/data/pagespeed.js). Las cifras
     finales van escritas en el HTML; con movimiento, cuentan desde 0 al entrar.
   · León's: resultados (js/data/resultados.js), cada bloque solo con TODOS
     sus datos: los mismos 4 indicadores de PageSpeed, y la caja de ventas
     (porcentaje grande + gráfica de barras en SVG que se dibuja al entrar).
     Sin ninguno completo, "Resultados en camino".
   También es la plantilla que usa el generador del HTML (module.exports).
   ========================================================================== */
(function (raiz) {
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  var MEDIDAS = [['rendimiento', 'Rendimiento'], ['accesibilidad', 'Accesibilidad'], ['buenasPracticas', 'Prácticas recomendadas'], ['seo', 'SEO']];
  var MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
  var CIRC = 263.9;
  var R = {};
  R.fecha = function (iso) { var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso || ''); return m ? (+m[3]) + ' de ' + MESES[+m[2] - 1] + ' de ' + m[1] : esc(iso); };
  R.etiqueta = function (D) {
    return 'PageSpeed Insights de ' + D.url.replace(/^https?:\/\//, '') + ': ' + MEDIDAS.map(function (m) { return m[1].toLowerCase() + ' ' + D[m[0]]; }).join(', ') + (D.agentic ? '; Agentic Browsing ' + D.agentic : '') + '.';
  };
  R.psiCompleto = function (D) {
    return !!(D && D.url && D.fecha && MEDIDAS.every(function (m) { return typeof D[m[0]] === 'number'; }));
  };
  R.psi = function (D, id) {
    var g = 'psiG-' + (id || 'caso');
    return '<svg width="0" height="0" style="position:absolute" aria-hidden="true" focusable="false"><defs><linearGradient id="' + g + '"x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#00e5ff"/><stop offset=".6" stop-color="#8ff4ff"/><stop offset="1" stop-color="#ffffff"/></linearGradient></defs></svg>' +
      '<ul class="psi-caso__lista">' + MEDIDAS.map(function (m) {
        var v = D[m[0]];
        return '<li class="psi-g" data-v="' + v + '"><svg class="psi-g__anillo" viewBox="0 0 100 100" aria-hidden="true"><circle class="psi-g__base" cx="50" cy="50" r="42"/><circle class="psi-g__arco" cx="50" cy="50" r="42" stroke="url(#' + g + ')" style="stroke-dashoffset:' + (CIRC * (1 - v / 100)).toFixed(1) + '"/></svg>' +
          '<b>' + v + '</b><span>' + esc(m[1]) + '</span></li>';
      }).join('') + '</ul>' +
      (D.agentic ? '<p class="psi-caso__pill"><i aria-hidden="true"></i>Agentic Browsing <b>' + esc(D.agentic) + '</b></p>' : '') +
      '<p class="psi-caso__nota">Medido con PageSpeed Insights · ' + esc(D.url.replace(/^https?:\/\//, '')) + ' · ' + R.fecha(D.fecha) + '</p>';
  };

  /* la vista de la web: vídeo, captura con scroll o card de espera */
  R.vista = function (caso, opc) {
    var nombre = esc(caso.nombre), dentro;
    if (caso.video && (caso.video.mp4 || caso.video.webm)) {
      dentro = '<video class="vitrina__video" muted loop playsinline preload="metadata" data-video' + (caso.video.poster ? ' poster="' + esc(caso.video.poster) + '"' : '') + ' aria-label="Recorrido por la web de ' + nombre + '">' +
        (caso.video.webm ? '<source src="' + esc(caso.video.webm) + '" type="video/webm">' : '') + (caso.video.mp4 ? '<source src="' + esc(caso.video.mp4) + '" type="video/mp4">' : '') + '</video>';
    } else if (opc.tira) {
      dentro = '<img class="vitrina__tira" src="' + esc(opc.tira) + '" alt="La web de ' + nombre + ': portada, servicios, trabajos y contacto." width="1024" height="2560" loading="lazy" decoding="async">';
    } else {
      return '<div class="vitrina vitrina--espera"><span class="vitrina__pantalla"><img class="vitrina__fondo" src="assets/proyectos/horno-2.webp" alt="" width="720" height="512" loading="lazy" decoding="async">' +
        '<span class="vitrina__espera"><span class="display">' + nombre + '</span><span class="vitrina__espera-t">' + esc(opc.espera || '') + '</span></span></span></div>';
    }
    var pantalla = '<span class="vitrina__pantalla">' + dentro + '</span>';
    return caso.url
      ? '<a class="vitrina" href="' + esc(caso.url) + '" target="_blank" rel="noopener" aria-label="Abrir la web de ' + nombre + ' (se abre en otra pestaña)">' + pantalla + '</a>'
      : '<div class="vitrina">' + pantalla + '</div>';
  };

  /* resultados de León's: solo con todos los datos */
  R.resultadosCompletos = function (D) {
    return !!(D && typeof D.aumentoVentasPct === 'number' && Array.isArray(D.serie) && D.serie.length > 1 && D.periodo && D.fuente);
  };
  R.resultados = function (D, espera, texto) {
    var psi = R.psiCompleto(D && D.pagespeed), ventas = R.resultadosCompletos(D);
    if (!psi && !ventas) {
      return '<div class="res-espera"><span class="res-espera__punto" aria-hidden="true"></span><p class="display res-espera__t">' + esc(espera) + '</p><p class="res-espera__x">' + esc(texto) + '</p></div>';
    }
    var cajaPsi = psi ? '<div class="psi-caso" data-psi-caso role="img" aria-label="' + esc(R.etiqueta(D.pagespeed)) + '">' + R.psi(D.pagespeed, 'res') + '</div>' : '';
    if (!ventas) return cajaPsi;
    var max = Math.max.apply(null, D.serie.map(function (s) { return +s.valor || 0; })) || 1;
    var W = 600, H = 240, pad = 28, n = D.serie.length, paso = (W - pad * 2) / n, ancho = paso * .56;
    var barras = D.serie.map(function (s, i) {
      var h = Math.max(2, (+s.valor || 0) / max * (H - pad * 2)), x = pad + i * paso + (paso - ancho) / 2, y = H - pad - h;
      return '<rect class="res-barra" style="--i:' + i + '" x="' + x.toFixed(1) + '" y="' + y.toFixed(1) + '" width="' + ancho.toFixed(1) + '" height="' + h.toFixed(1) + '" rx="6" fill="url(#resG)"/>' +
        '<text class="res-eti" x="' + (x + ancho / 2).toFixed(1) + '" y="' + (H - 6) + '" text-anchor="middle">' + esc(s.etiqueta) + '</text>';
    }).join('');
    var puntos = D.serie.map(function (s, i) { var h = (+s.valor || 0) / max * (H - pad * 2); return (pad + i * paso + paso / 2).toFixed(1) + ',' + (H - pad - h - 10).toFixed(1); }).join(' ');
    var resumen = 'Ventas de ' + esc(D.periodo) + ': ' + D.serie.map(function (s) { return esc(s.etiqueta) + ' ' + esc(s.valor); }).join(', ') + '. Aumento del ' + D.aumentoVentasPct + ' %.';
    return cajaPsi + '<div class="res">' +
      '<p class="res__pct"><span class="display">+' + esc(D.aumentoVentasPct) + '&nbsp;%</span><span class="res__pct-t">de aumento de ventas</span></p>' +
      '<figure class="res__graf"><svg viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="' + resumen + '"><defs><linearGradient id="resG" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stop-color="#2b4dff"/><stop offset="1" stop-color="#00e5ff"/></linearGradient></defs>' +
        '<line class="res-base" x1="' + pad + '" x2="' + (W - pad) + '" y1="' + (H - pad) + '" y2="' + (H - pad) + '"/>' + barras +
        '<polyline class="res-linea" points="' + puntos + '" pathLength="1"/></svg>' +
        '<figcaption>' + esc(D.periodo) + ' · ' + esc(D.fuente) + '</figcaption></figure></div>';
  };
  if (typeof module !== 'undefined' && module.exports) { module.exports = R; return; }

  /* ---------- en el navegador ---------- */
  var d = raiz.document, EV = raiz.EV || {};
  var vivo = EV.mode === 'cine' && !EV.reducedMotion && 'IntersectionObserver' in raiz;

  // vídeos: solo corren en pantalla; con movimiento reducido, el póster
  var videos = Array.prototype.slice.call(d.querySelectorAll('[data-video]'));
  if (videos.length && vivo) {
    var ioV = new IntersectionObserver(function (es) { es.forEach(function (e) { var v = e.target; if (e.isIntersecting) { var pr = v.play(); if (pr && pr.catch) pr.catch(function () {}); } else v.pause(); }); }, { threshold: .25 });
    videos.forEach(function (v) { ioV.observe(v); });
  }

  // indicadores de PageSpeed: con movimiento, cuentan desde 0 al entrar
  function animarPsi(caja) {
    if (vivo && raiz.gsap) {
      var gs = Array.prototype.slice.call(caja.querySelectorAll('.psi-g')).map(function (li) { return { v: +li.dataset.v, b: li.querySelector('b'), a: li.querySelector('.psi-g__arco') }; });
      var pon = function (g, k) { g.b.textContent = Math.round(g.v * k); g.a.style.strokeDashoffset = (CIRC * (1 - g.v / 100 * k)).toFixed(1); };
      gs.forEach(function (g) { pon(g, 0); });
      var io = new IntersectionObserver(function (es) {
        if (!es[0].isIntersecting) return;
        io.disconnect();
        gs.forEach(function (g, i) { var o = { k: 0 }; gsap.to(o, { k: 1, duration: 1.6, delay: .15 + i * .12, ease: 'power3.out', onUpdate: function () { pon(g, o.k); } }); });
      }, { threshold: .4 });
      io.observe(caja);
    }
  }

  // PageSpeed de Disco
  var D = raiz.EVIMES_PAGESPEED, caja = d.querySelector('#disco [data-psi-caso]');
  if (caja && !D) caja.remove();
  if (caja && D) {
    caja.setAttribute('aria-label', R.etiqueta(D));
    caja.innerHTML = R.psi(D);
    animarPsi(caja);
  }

  // Resultados de León's
  var T = raiz.EVIMES_PROYECTOS_PAGINA, RES = raiz.EVIMES_RESULTADOS, cajaR = d.querySelector('[data-resultados]');
  if (cajaR && T && RES) {
    cajaR.innerHTML = R.resultados(RES[cajaR.getAttribute('data-resultados')], T.leons.resultadosEspera, T.leons.resultadosTexto);
    Array.prototype.forEach.call(cajaR.querySelectorAll('[data-psi-caso]'), animarPsi);
    var graf = cajaR.querySelector('.res');
    if (graf) {
      if (!vivo) graf.classList.add('is-dibujada');
      else { var ioR = new IntersectionObserver(function (es) { if (es[0].isIntersecting) { ioR.disconnect(); graf.classList.add('is-dibujada'); } }, { threshold: .35 }); ioR.observe(graf); }
    }
  }
})(typeof window !== 'undefined' ? window : this);
