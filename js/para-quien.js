/* ==========================================================================
   para-quien.js — #para-quien, "Con quién trabajamos y nuestro trabajo"
   (desde backup-pre-para-quien; prototipo aprobado Downloads/evimes-para-quien).
   Script clásico, después de js/recorrido.js.
   · LA FRASE ES EL INTERRUPTOR: los dos públicos son <button aria-pressed>;
     clic o flechas izquierda/derecha. Por defecto, agencias. La frase no se anima.
   · La anotación del público en gris (.pq-tip): "¿Tienes un negocio? Toca
     aquí" / "¿Eres una agencia? Toca aquí" y una flecha que baja hasta la
     esquina de arriba a la derecha de la palabra (si no cabe, encima de ella,
     alineada a su izquierda; nunca sobre el texto de la frase). Se recoloca al
     cambiar el tamaño y al cargar las fuentes; al cambiar de público salta a la
     otra palabra con un fundido (.3 s). La flecha se dibuja una vez al entrar
     la sección en pantalla. Pulsar su frase es pulsar la palabra.
   · Los dos públicos están en el HTML (el que no toca, con hidden, maquetado
     encima y fuera del flujo: css/para-quien.css): cambiar no mueve el scroll.
     Se iguala el alto de sus dos columnas, para que las ventanas empiecen a la
     misma altura; al cambiar, Lenis se entera del alto nuevo.
   · Animaciones, una cada vez y ligadas al scroll (ninguna en bucle):
       textos   el problema, lo que hacemos (W 10) y el cierre (W 6): las tres
                franjas de #lateral (EV.recorrido.Bloque, el mismo código), en
                orden de lectura, a medida que suben desde abajo de la pantalla.
                Mientras baja la persiana, al ritmo de lo que descubre.
       ventana  una línea de 1 px cruza y se abre en la ventana negra (clip-path
                en dos fases, suavizado); el dispositivo sube 30 px a su sitio.
       anillos  cuando la ventana termina de abrirse, cada arco se rellena de 0 a
                su valor real (1,1 s, ease-out) mientras su número cuenta; uno
                tras otro (120 ms). Solo la primera vez.
   · Al cambiar de público (por tiempo, sin mover el scroll): los textos se
     borran (.35 s) y la ventana se cierra en línea; se cambia el contenido y
     todo vuelve a escribirse y abrirse (.8 s).
   · El relevo (desde backup-pre-para-quien-planes): cuando se suelta el panel
     de #lateral, su "¿PARA QUIÉN?" (EV.lateralRelevo) pasa a .pq-relevo, fijo a
     la pantalla en el mismo sitio, y al bajar se encoge (ligado al scroll, con
     suavizado) hasta el título discreto, que se queda arriba sobre una franja
     gris mientras dura la sección (la cabecera, clara: EV.cabeceraGris).
   · El cierre (.pq-fin, desde backup-pre-puente): el subrayado del CTA final se
     alarga hasta todo el ancho y el gris se cierra hacia esa línea; detrás,
     #como en negro (la cabecera, oscura: EV.cabeceraOscura).
   · Posiciones cacheadas (sin lecturas de layout por fotograma); un callback
     en gsap.ticker que no calcula con la sección lejos ni quieta.
   · Movimiento reducido o versión fija: todo visible desde el principio.
   ========================================================================== */
(function () {
  var sec = document.querySelector('[data-pq]');
  if (!sec) return;
  var EV = (window.EV = window.EV || {});
  var R = EV.recorrido || null;
  var quieto = EV.mode !== 'cine' || !R;
  var cl = function (v) { return v < 0 ? 0 : v > 1 ? 1 : v; };
  var sale = function (t) { return 1 - Math.pow(1 - t, 3); };                                     // ease-out
  var io = R ? R.util.suaviza : function (t) { return t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; };   // ease-in-out
  var escritor = R ? R.util.escritor : function (el, p) { return function (v) { el.style[p] = v; }; };
  var scrollY = function () { var l = EV.home && EV.home.lenis; return l ? l.scroll : window.scrollY; };
  var $$ = function (s, c) { return [].slice.call((c || sec).querySelectorAll(s)); };
  var arriba = function (el) { var y = 0, n = el; while (n) { y += n.offsetTop; n = n.offsetParent; } return y; };
  var C = 339.292;                                // el perímetro de los anillos (r 54)

  var botones = $$('.pq-aud'), frase = sec.querySelector('.pq-switch');
  // la pestaña pegada a cada ventana (una por panel, sincronizadas con la frase)
  var tabs = $$('.pq-tab').map(function (el) {
    return { el: el, l: el.querySelector('.pq-tab__l'), bs: $$('.pq-tab__b', el), op: escritor(el, 'opacity'), tr: escritor(el, 'transform'), letras: {} };
  });
  var radios = [].concat.apply([], tabs.map(function (t) { return t.bs; }));
  var tabAnim = null;                             // { n, t }: las letras del nombre que pasa a activo (.5 s)
  // la línea naranja, bajo la opción activa (del punto al final del nombre)
  function linea(t, n) {
    var b = t.bs.filter(function (b) { return b.dataset.for === n; })[0];
    if (!b) return;
    // medido sobre el texto (un Range): si el nombre se parte en dos líneas (móvil estrecho), la línea va bajo él
    var p = b.querySelector('.pq-tab__p'), rg = document.createRange();
    rg.selectNodeContents(b.querySelector('.pq-tab__t'));
    var tb = t.el.getBoundingClientRect(), a = p.getBoundingClientRect().left - tb.left, w = rg.getBoundingClientRect().right - tb.left - a;
    if (w > 0) t.l.style.transform = 'translate3d(' + a.toFixed(2) + 'px,0,0) scaleX(' + (w / 100).toFixed(4) + ')';
  }
  var panelDe = function (el) { return el.closest('[data-aud]'); };
  var aud = 'ag', pendiente = null;

  sec.classList.add('pq-viva');
  if (!quieto) sec.classList.add('pq-vivo');

  /* ---------- lo animable de cada público ---------- */
  var auds = {};
  $$('[data-aud]').forEach(function (p) {
    var win = p.querySelector('.pq-window'), stage = win.querySelector('.pq-stage'), info = win.querySelector('.pq-info');
    var A = auds[p.dataset.aud] = {
      panel: p, win: win, talk: p.querySelector('.pq-talk'), caso: p.querySelector('.pq-caso'), winTop: 0, winH: 0, fin: 0,
      bloques: [], anillos: [], o: 0, ot: 0, fase: -1, ve70: false, contado: false
    };
    if (quieto) return;
    A.bloques = $$('[data-type]', p).map(function (el) {
      var flecha = el.parentNode.querySelector('.pq-cta__arr svg');
      // el subrayado del CTA (::after, scaleX(var(--u))): se dibuja con la flecha; es el que se alarga en el cierre
      var cta = flecha && el.closest('.pq-cta'), u;
      var linea = cta && function (v) { if (v !== u) { u = v; cta.style.setProperty('--u', v); } };
      // start: dónde empieza (el arriba del bloque, en fracción de pantalla); todos terminan al 70 %
      return { el: el, start: parseFloat(el.dataset.start) || .98, top: 0, lleno: false, b: new R.Bloque({ el: el, W: parseFloat(el.dataset.type) || 8 }), flecha: flecha && escritor(flecha, 'opacity'), linea: linea };
    });
    A.clip = escritor(win, 'clipPath');
    A.anillos = $$('.pq-psi__g', p).map(function (li) {
      return { li: li, b: li.querySelector('b'), arco: li.querySelector('.pq-psi__arco'), v: 0 };
    });
  });
  // los anillos se disparan con la ventana visible al 70 % (IntersectionObserver), no por la posición del scroll
  if (!quieto && window.IntersectionObserver) {
    var vista = new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        Object.keys(auds).forEach(function (k) { if (auds[k].win === e.target) auds[k].ve70 = e.intersectionRatio >= .69; });
      });
      sucio = true;
    }, { threshold: [0, .7] });
    Object.keys(auds).forEach(function (k) { vista.observe(auds[k].win); });
  } else Object.keys(auds).forEach(function (k) { auds[k].ve70 = true; });
  // el orden de dentro de la ventana, de vuelta al principio (cerrada del todo, o al cambiar de caso)
  function reiniciar(A) {
    if (A.fase < 0) return;
    A.fase = -1; A.t = 0;
    A.win.classList.remove('is-sube', 'is-info', 'is-sale');
    if (A === (cuenta && cuenta.A)) cuenta = null;
    A.contado = false;
    A.anillos.forEach(function (d) { if (d.ponB) { d.ponB('0'); d.ponArco(C + 'px'); d.li.classList.add('is-contando'); } });
  }

  /* ---------- el interruptor ---------- */
  var swap = 1, meta = 1;                         // 1: escrito y abierto · 0: borrado y cerrado (el cambio)
  function aplicar(n) {
    aud = n; pendiente = null;
    var foco = document.activeElement;
    Object.keys(auds).forEach(function (k) { auds[k].panel.hidden = k !== n; });
    // el foco estaba en el interruptor del panel que se va: pasa al mismo botón del que entra
    if (foco && radios.indexOf(foco) >= 0) {
      var otro = radios.filter(function (r) { return panelDe(r).dataset.aud === n && r.dataset.for === foco.dataset.for; })[0];
      if (otro) otro.focus({ preventScroll: true });
    }
    sec.dataset.active = n;
    if (EV.home && EV.home.lenis) EV.home.lenis.resize();
    sucio = true;
  }
  function elegir(n, foco) {
    botones.forEach(function (b) { b.setAttribute('aria-pressed', String(b.dataset.for === n)); });
    tabs.forEach(function (t) { t.el.dataset.on = n; linea(t, n); });
    radios.forEach(function (r) { var si = r.dataset.for === n; r.setAttribute('aria-checked', String(si)); r.tabIndex = si ? 0 : -1; });
    if (foco === 'tab') {
      var r = radios.filter(function (r) { return !panelDe(r).hidden && r.dataset.for === n; })[0];
      if (r) r.focus({ preventScroll: true });
    } else if (foco) botones.filter(function (b) { return b.dataset.for === n; })[0].focus({ preventScroll: true });
    if (n === (pendiente || aud)) return;
    tip.cambio();
    // el nombre que pasa a activo se escribe otra vez con las franjas
    if (!quieto && tabs.some(function (t) { return t.letras[n]; })) {
      tabAnim = { n: n, t: 0 };
      tabs.forEach(function (t) { if (t.letras[n]) t.letras[n].escribir(0); });
    }
    if (quieto) { aplicar(n); return; }
    if (n === aud) {                                // vuelve antes de que dé tiempo a cambiar
      pendiente = null; meta = 1;
      if (enSitio) { enSitio = null; auds[aud].win.classList.remove('is-sale'); }
      return;
    }
    pendiente = n;
    // con la ventana del caso a la vista: el scroll no se mueve, la ventana se queda en su sitio (abierta) y su
    // contenido se va (.25 s); el caso nuevo entra con su orden (dispositivo, texto, anillos). Más arriba (en la
    // frase), los textos se borran y se reescriben y la ventana se cierra en línea y se abre.
    var w = auds[aud].win.getBoundingClientRect();
    if (w.top < M.vh * .7 && w.bottom > M.vh * .3) { enSitio = { t: 0 }; auds[aud].win.classList.add('is-sale'); }
    else meta = 0;
  }
  botones.forEach(function (b) { b.addEventListener('click', function () { elegir(b.dataset.for); }); });
  radios.forEach(function (r) { r.addEventListener('click', function () { elegir(r.dataset.for); }); });
  tabs.forEach(function (t) {
    t.el.addEventListener('keydown', function (e) {
      if (['ArrowRight', 'ArrowLeft', 'ArrowDown', 'ArrowUp'].indexOf(e.key) < 0) return;
      e.preventDefault();
      elegir((pendiente || aud) === 'ag' ? 'nl' : 'ag', 'tab');
    });
  });
  frase.addEventListener('keydown', function (e) {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
    e.preventDefault();
    elegir((pendiente || aud) === 'ag' ? 'nl' : 'ag', true);
  });

  /* ---------- la anotación del público en gris ---------- */
  var tip = (function () {
    var el = sec.querySelector('.pq-tip'), cabeza = sec.querySelector('.pq-cabeza');
    var nada = { cambio: function () {}, colocar: function () {} };
    if (!el || !cabeza) return nada;
    var texto = el.querySelector('.pq-tip__t'), svg = el.querySelector('.pq-tip__f');
    var cuerpo = svg.querySelector('.pq-tip__c'), punta = svg.querySelector('.pq-tip__p');
    var TEXTOS = { nl: '¿Tienes un negocio?<br>Toca aquí', ag: '¿Eres una agencia?<br>Toca aquí' };
    var para = null, salto = null;
    texto.addEventListener('click', function () { if (para) elegir(para); });

    // los rectángulos de cada línea de texto de un nodo, relativos a la cabeza. Solo los nodos de texto: un
    // Range sobre el elemento devuelve también la caja entera de cada botón (en móvil, todo el ancho)
    function lineas(nodo, c) {
      var out = [], r = document.createRange(), tw = document.createTreeWalker(nodo, NodeFilter.SHOW_TEXT), t;
      while ((t = tw.nextNode())) {
        if (!t.textContent.trim()) continue;
        r.selectNodeContents(t);
        [].forEach.call(r.getClientRects(), function (q) {
          if (q.width > 1 && q.height > 1) out.push({ l: q.left - c.left, t: q.top - c.top, r: q.right - c.left, b: q.bottom - c.top });
        });
      }
      return out;
    }
    // -1 si la caja no toca el texto de la frase; si lo toca, el borde derecho de lo que toca
    function choca(caja, texto) {
      var m = -1;
      texto.forEach(function (q) { if (caja.l < q.r + 10 && caja.r > q.l - 10 && caja.t < q.b && caja.b > q.t) m = Math.max(m, q.r); });
      return m;
    }
    function colocar() {
      var b = botones.filter(function (k) { return k.getAttribute('aria-pressed') === 'false'; })[0];
      if (!b) return;
      para = b.dataset.for;
      texto.innerHTML = TEXTOS[para] || '';
      var c = cabeza.getBoundingClientRect(), W = c.width;
      var todo = lineas(frase, c), suyas = lineas(b, c);
      if (!suyas.length) return;
      // la primera línea de la palabra (arriba y, en ella, la de la izquierda)
      var pri = suyas.reduce(function (a, q) { return q.t < a.t - 2 || (Math.abs(q.t - a.t) <= 2 && q.l < a.l) ? q : a; });
      var ult = suyas.reduce(function (a, q) { return q.t > a.t + 2 || (Math.abs(q.t - a.t) <= 2 && q.l < a.l) ? q : a; });
      var yT = pri.t + (pri.b - pri.t) * .2;            // a la altura de lo alto de las mayúsculas
      // la frase va 36 px por encima de la punta (o por debajo); se aparta a la derecha de lo que toque y, si hace falta, se estrecha
      function prueba(T, x, abajo, aire) {
        aire = aire || 36;
        texto.style.maxWidth = '';
        for (var i = 0; i < 5; i++) {
          var w = texto.offsetWidth, h = texto.offsetHeight;
          var caja = abajo ? { l: x, r: x + w, t: T.y + aire, b: T.y + aire + h } : { l: x, r: x + w, t: T.y - aire - h, b: T.y - aire };
          var m = choca(caja, todo);
          if (m < 0 && caja.r <= W + 1 && caja.t >= -h) return { T: T, x: x, y: caja.t, h: h, abajo: abajo };
          if (m >= 0) x = Math.ceil(m + 14);
          if (x + w > W + 1) { if (W - x < 96) return null; texto.style.maxWidth = Math.floor(W - x) + 'px'; }
        }
        return null;
      }
      // en móvil, siempre encima de la palabra
      var P = (window.innerWidth > 860 && prueba({ x: pri.r + 3, y: yT }, pri.r + 24)) ||   // arriba a la derecha
              prueba({ x: pri.l + Math.min(28, (pri.r - pri.l) * .2), y: yT }, pri.l) ||      // encima, alineada a su izquierda
              prueba({ x: pri.l + Math.min(28, (pri.r - pri.l) * .2), y: yT }, pri.l, false, 20) ||   // encima, más pegada (titular grande: no pisa la línea de arriba)
              // pantallas muy estrechas (320 px), donde la línea de encima llena el ancho: debajo, la flecha sube a la palabra
              prueba({ x: ult.l + Math.min(28, (ult.r - ult.l) * .2), y: ult.b - (ult.b - ult.t) * .2 }, ult.l, true);
      if (!P) { el.classList.remove('is-lista'); return; }
      texto.style.transform = 'translate3d(' + Math.round(P.x) + 'px,' + Math.round(P.y) + 'px,0)';

      // la flecha: sale de la frase (por debajo o, si va debajo de la palabra, por encima) y entra en la palabra
      var S = { x: P.x + 14, y: P.abajo ? P.y - 4 : P.y + P.h + 4 }, T = P.T;
      var c1 = { x: S.x, y: S.y + (T.y - S.y) * .75 }, c2 = { x: T.x + (S.x - T.x) * .5, y: T.y };
      var ox = Math.min(S.x, T.x) - 10, oy = Math.min(S.y, T.y) - 8, an = Math.abs(S.x - T.x) + 20, al = Math.abs(T.y - S.y) + 16;
      var p = function (q) { return (q.x - ox).toFixed(1) + ' ' + (q.y - oy).toFixed(1); };
      cuerpo.setAttribute('d', 'M' + p(S) + 'C' + p(c1) + ' ' + p(c2) + ' ' + p(T));
      var dx = T.x - c2.x, dy = T.y - c2.y;
      if (Math.abs(dx) + Math.abs(dy) < 1) { dx = T.x - c1.x; dy = T.y - c1.y; }
      var L = Math.hypot(dx, dy) || 1, ux = -dx / L, uy = -dy / L, k = Math.cos(.6), s = Math.sin(.6), n = 6.5;
      var a1 = { x: T.x + n * (ux * k - uy * s), y: T.y + n * (ux * s + uy * k) }, a2 = { x: T.x + n * (ux * k + uy * s), y: T.y + n * (-ux * s + uy * k) };
      punta.setAttribute('d', 'M' + p(a1) + 'L' + p(T) + 'L' + p(a2));
      svg.setAttribute('viewBox', '0 0 ' + an.toFixed(1) + ' ' + al.toFixed(1));
      svg.setAttribute('width', an.toFixed(1)); svg.setAttribute('height', al.toFixed(1));
      svg.style.transform = 'translate3d(' + Math.round(ox) + 'px,' + Math.round(oy) + 'px,0)';
      el.classList.add('is-lista');
    }
    function cambio() {
      // salta a la otra palabra con un fundido (.3 s) y cambia su texto
      el.classList.add('is-fuera');
      clearTimeout(salto);
      salto = setTimeout(function () { colocar(); el.classList.remove('is-fuera'); }, 300);
    }
    // la flecha se dibuja una vez, cuando la frase está a la vista
    if (window.IntersectionObserver) {
      var io = new IntersectionObserver(function (es) {
        if (!es[0].isIntersecting) return;
        io.disconnect();
        (function espera() {
          el.classList.add('is-dibuja');
        })();
      }, { threshold: .6 });
      io.observe(frase);
    } else el.classList.add('is-dibuja');
    return { cambio: cambio, colocar: colocar };
  })();

  /* ---------- el relevo de "¿Para quién?" y el cierre del gris (desde backup-pre-puente) ----------
     El cierre (.pq-fin): un pin de una pantalla + 25vh (el subrayado) + 60vh (el cierre). Se engancha con el
     CTA final a media pantalla; desde ahí el contenido (.pq-auds, por encima del pin) se queda quieto
     (transform = lo que baja el scroll) y:
       1. el subrayado del CTA (que pasa a ser .pq-fin__l, en el mismo sitio y con el mismo grosor) se alarga
          hasta ocupar todo el ancho de la pantalla;
       2. el gris se cierra por arriba y por abajo hacia esa línea hasta 1 px (la línea de tinta se disuelve
          en él) y la línea gris se recoge hacia el centro y se desvanece. Espejo de la apertura de #lateral.
     Detrás ya está #como (en negro sobre la red: sube por detrás, css/para-quien.css). Las ondas (z 5, por
     encima del pin) se recortan al negro que va quedando (clip-path del canvas). Suavizado 9.
     Movimiento reducido / versión fija: sin pin, corte limpio del gris al negro. */
  var relevo = (function () {
    var caja = sec.querySelector('.pq-relevo'), fin = sec.querySelector('.pq-fin');
    if (!caja || !fin) return { medir: function () {} };
    var grande = caja.querySelector('.pq-relevo__g'), chico = caja.querySelector('.pq-relevo__t'), banda = caja.querySelector('.pq-relevo__banda');
    var gris = fin.querySelector('.pq-fin__gris'), pin = fin.querySelector('.pq-fin__pin'), lin = fin.querySelector('.pq-fin__l');
    var audsEl = sec.querySelector('.pq-auds'), ondas = document.getElementById('ondas');
    var pon = {
      g: escritor(grande, 'transform'), gO: escritor(grande, 'opacity'), cO: escritor(chico, 'opacity'),
      bO: escritor(banda, 'opacity'), cajaO: escritor(caja, 'opacity'),
      clip: escritor(gris, 'clipPath'), grisO: escritor(gris, 'opacity'),
      audsO: escritor(audsEl, 'opacity'), audsT: escritor(audsEl, 'transform'), audsC: escritor(audsEl, 'clipPath'),
      lT: escritor(lin, 'transform'), lO: escritor(lin, 'opacity'),
      ondas: ondas ? escritor(ondas, 'clipPath') : function () {}
    };
    var F = { top: 0, alto: 0, pin: 0, G: 1, C: 1, vw: 0, cx: 0, cy: 0, fs: 0, cta: {} }, L = null, ponLat = null;
    var k = 0, g = 0, c = 0, visible = null, ultima = null, fijo = false, cerrando = false;
    function medir() {
      L = EV.lateralRelevo ? EV.lateralRelevo() : null;
      F.top = arriba(fin); F.alto = fin.offsetHeight; F.pin = pin.offsetHeight; F.vw = document.documentElement.clientWidth;
      F.C = Math.min(window.innerHeight * .6, Math.max(1, F.alto - F.pin));   // el cierre: 60vh como máximo
      F.G = Math.max(1, F.alto - F.pin - F.C);                                // antes, el subrayado
      F.auds = { y: arriba(audsEl), h: audsEl.offsetHeight, x: audsEl.getBoundingClientRect().left, w: audsEl.offsetWidth };
      // el subrayado de cada CTA (.pq-cta::after: bottom −.06em, alto .05em), relativo al pin enganchado
      Object.keys(auds).forEach(function (n) {
        var el = auds[n].panel.querySelector('.pq-cta');
        if (!el) return;
        var fs = parseFloat(getComputedStyle(el).fontSize) || 60, t = Math.max(1, fs * .05);
        F.cta[n] = { x: el.getBoundingClientRect().left, w: el.offsetWidth, y: arriba(el) + el.offsetHeight + fs * .01 - F.top, t: t };
      });
      var r = chico.getBoundingClientRect();
      F.cx = r.left; F.cy = r.top;                       // el título discreto (position: fixed: ya está en coordenadas de pantalla)
      if (L) {
        var cs = getComputedStyle(L.el);
        F.fs = parseFloat(cs.fontSize) || 100;
        grande.style.fontSize = cs.fontSize;
        grande.style.width = Math.ceil(L.w + 1) + 'px';
        if (!ponLat) ponLat = escritor(L.el, 'opacity');
      }
      ultima = null;
    }
    function bandera(nombre, v) {
      if (!!EV[nombre] === v) return;
      EV[nombre] = v;
      if (EV.home && EV.home.refrescar) EV.home.refrescar();
    }
    function paso(dt) {
      if (!L) { medir(); if (!L) return; }
      L = EV.lateralRelevo() || L;                       // suelta, x e y, al día (#lateral cambia de alto al montar sus letras)
      var y = scrollY(), vh = M.vh;
      var suelta = L.suelta, d = y - suelta;
      // 1) el relevo: 0 = la grande donde la deja #lateral · 1 = el título discreto
      var meta = d <= 0 ? 0 : quieto ? 1 : cl(d / (vh * .7));
      // 2) el cierre: dp = lo que se ha bajado con el pin enganchado; gm = el subrayado (0 → todo el ancho);
      //    cm = el gris (0 = a pantalla completa · 1 = negro)
      var dp = y - F.top;
      var gm = quieto ? 0 : cl(dp / F.G), cm = quieto ? (dp >= 0 ? 1 : 0) : cl((dp - F.G) / F.C);
      if (y === ultima && k === meta && g === gm && c === cm) return;   // quieto y asentado: nada que escribir
      ultima = y;
      k = quieto ? meta : k + (meta - k) * (1 - Math.exp(-dt * 9));
      if (Math.abs(meta - k) < 1e-4) k = meta;
      var e = io(k);
      g = quieto ? gm : g + (gm - g) * (1 - Math.exp(-dt * 9));
      if (Math.abs(gm - g) < 1e-4) g = gm;
      c = quieto ? cm : c + (cm - c) * (1 - Math.exp(-dt * 9));
      if (Math.abs(cm - c) < 1e-4) c = cm;
      // el título se va al empezar a cerrarse el gris (con el contenido)
      var vete = quieto ? cl((y - (F.top - vh * .35)) / (vh * .3)) : cl(c / .1);   // antes de que el negro llegue a su franja

      var ve = (d > 0 || k > .002) && vete < 1;
      if (ve !== visible) { visible = ve; caja.classList.toggle('is-on', ve); }
      if (ponLat) ponLat(ve ? '0' : '');                 // la de #lateral, oculta mientras la lleva el relevo
      if (ve) {
        var s = 1 + (13 / F.fs - 1) * e;
        var gx = L.x + (F.cx - L.x) * e, gy = L.y + (F.cy - L.y) * e;
        pon.g('translate3d(' + gx.toFixed(2) + 'px,' + gy.toFixed(2) + 'px,0) scale(' + s.toFixed(5) + ')');
        var cruce = cl((e - .8) / .2);                    // al final, la grande cede al título (13 px, .16em)
        pon.gO((1 - cruce).toFixed(3));
        pon.cO(cruce.toFixed(3));
        pon.bO(cl((e - .55) / .35).toFixed(3));
        pon.cajaO((1 - vete).toFixed(3));
      }
      bandera('cabeceraGris', ve && e > .75 && vete < .5);
      if (quieto) return;

      var U = F.cta[aud], tramo = F.alto - F.pin;
      if (!U) return;
      // el contenido, quieto mientras dura el pin (el CTA no se mueve: su subrayado es la línea del pin)
      var enPin = dp > 0;
      pon.audsT(enPin ? 'translate3d(0,' + Math.min(dp, tramo).toFixed(2) + 'px,0)' : '');
      if (enPin !== fijo) { fijo = enPin; sec.classList.toggle('pq-fijo', fijo); }
      // 1) el subrayado: de debajo del CTA a todo el ancho (izquierda y derecha a la vez, solo transform)
      var eg = io(g), izq = U.x * (1 - eg), ancho = U.w * (1 - eg) + F.vw * eg;
      pon.lT('translate3d(' + izq.toFixed(2) + 'px,' + U.y.toFixed(2) + 'px,0) scale(' + (ancho / 100).toFixed(4) + ',' + U.t.toFixed(2) + ')');
      // 2) el gris se cierra hacia la línea (su centro) hasta 1 px; después la línea gris se recoge al centro y se va
      var a = io(cl(c / .55)), b = io(cl((c - .5) / .5)), Lc = U.y + U.t / 2;
      var arr = a * (Lc - .5), aba = a * (F.pin - Lc - .5), lados = b * 50;
      pon.clip(c <= 0 ? 'none' : 'inset(' + arr.toFixed(2) + 'px ' + lados.toFixed(2) + '% ' + aba.toFixed(2) + 'px ' + lados.toFixed(2) + '%)');
      pon.grisO(c <= 0 ? '' : (1 - b).toFixed(3));
      pon.lO(enPin ? (1 - cl((a - .55) / .4)).toFixed(3) : '0');   // la tinta se disuelve en la franja gris
      pon.audsO(c <= 0 ? '' : (1 - cl(c / .4)).toFixed(3));
      if ((c > .2) !== cerrando) { cerrando = c > .2; sec.classList.toggle('pq-cerrando', cerrando); }
      // las ondas (z 5) van por encima del pin: solo se ven en el negro que deja el gris
      var p0 = dp < 0 ? -dp : dp <= tramo ? 0 : tramo - dp;          // el arriba del pin en la pantalla
      var T = p0 + arr, B = p0 + F.pin - aba, I = F.vw * lados / 100, D = F.vw - I;
      // el contenido, recortado a la franja gris (como si estuviera impreso en ella)
      if (c <= 0) pon.audsC('');
      else {
        var aT = F.auds.y - y + Math.min(Math.max(dp, 0), tramo);
        pon.audsC('inset(' + Math.max(0, T - aT).toFixed(1) + 'px ' + Math.max(0, F.auds.x + F.auds.w - D).toFixed(1) + 'px ' + Math.max(0, aT + F.auds.h - B).toFixed(1) + 'px ' + Math.max(0, I - F.auds.x).toFixed(1) + 'px)');
      }
      if (b >= 1 || B <= 0 || T >= vh || D <= I) pon.ondas('');
      else pon.ondas('polygon(evenodd, 0 0, 100% 0, 100% 100%, 0 100%, 0 0, ' + I.toFixed(1) + 'px ' + T.toFixed(1) + 'px, ' + D.toFixed(1) + 'px ' + T.toFixed(1) + 'px, ' + D.toFixed(1) + 'px ' + B.toFixed(1) + 'px, ' + I.toFixed(1) + 'px ' + B.toFixed(1) + 'px, ' + I.toFixed(1) + 'px ' + T.toFixed(1) + 'px)');
      // la cabecera: oscura en cuanto el negro llega a su línea central, y mientras el cierre (ya negro) siga bajo ella
      bandera('cabeceraOscura', y >= F.top && y < F.top + F.alto && arr > 32);
    }
    if (window.gsap) gsap.ticker.add(function (t, dms) { if (!document.hidden) paso(Math.min(.1, (dms || 16.7) / 1000)); });
    else (function f() { requestAnimationFrame(f); paso(1 / 60); })();
    // a donde salta un ancla de lo que hay detrás (#como): con el gris ya cerrado
    EV.finGris = function () { medir(); return F.top + F.alto - F.pin; };
    return { medir: medir };
  })();

  /* ---------- medidas (solo al cambiar el tamaño) ---------- */
  var M = { vh: 0, top: 0, alto: 0, cab: 108 };
  function igualar() {
    var els = $$('.pq-talk');
    els.forEach(function (e) { e.style.minHeight = ''; });
    var alto = Math.max.apply(null, els.map(function (e) { return e.offsetHeight; }));
    els.forEach(function (e) { e.style.minHeight = alto + 'px'; });
  }
  // los sticky de lectura: centrados en lo que queda bajo la franja del título fijo (64 px de cabecera + 44)
  function fijar() {
    if (quieto) return;
    var banda = sec.querySelector('.pq-relevo__banda');
    M.cab = banda ? banda.offsetHeight : 108;
    var libre = function (h) { return Math.max(M.cab + 8, Math.round(M.cab + (M.vh - M.cab - h) / 2)); };
    Object.keys(auds).forEach(function (k) {
      var A = auds[k];
      if (A.talk) A.talk.style.top = libre(A.talk.offsetHeight) + 'px';
      if (A.caso) {
        var tab = A.caso.querySelector('.pq-tab'), th = tab ? tab.offsetHeight : 0;
        A.caso.style.top = libre(A.caso.offsetHeight) + 'px';
        A.fin = libre(A.caso.offsetHeight) + th;             // donde se queda la ventana: ahí termina de abrirse
      }
      A.winH = A.win.offsetHeight;
    });
  }
  function posiciones() {
    M.top = arriba(sec); M.alto = sec.offsetHeight;
    relevo.medir();
    Object.keys(auds).forEach(function (k) {
      var A = auds[k];
      A.winTop = arriba(A.win);
      A.bloques.forEach(function (b) { b.top = arriba(b.el); });
    });
    sucio = true;
  }
  function medir() {
    igualar();
    tip.colocar();
    M.vh = window.innerHeight;
    fijar();
    posiciones();
    if (listas) Object.keys(auds).forEach(function (k) { auds[k].bloques.forEach(function (b) { b.b.ordenar(); }); });
    tabs.forEach(function (t) {
      Object.keys(t.letras).forEach(function (k) { t.letras[k].ordenar(); if (!tabAnim || tabAnim.n !== k) t.letras[k].escribir(1); });
      linea(t, pendiente || aud);
    });
  }

  /* ---------- montar las letras (en reposo) ---------- */
  var listas = false;
  function montar() {
    if (listas || quieto) return;
    listas = true;
    Object.keys(auds).forEach(function (k) {
      var A = auds[k];
      A.bloques.forEach(function (b) { b.b.partir(); });
      // los anillos, desde 0 (js/trabajo-selecto.js ya puso los valores reales en data-v)
      A.anillos.forEach(function (d) {
        d.v = parseFloat(d.li.dataset.v) || parseFloat(d.b.textContent) || 0;
        d.li.classList.add('is-contando');
        d.ponB = (function (el) { var u; return function (v) { if (v !== u) { u = v; el.textContent = v; } }; })(d.b);
        d.ponArco = escritor(d.arco, 'strokeDashoffset');
        d.ponB('0'); d.ponArco(C + 'px');
      });
    });
    tabs.forEach(function (t) {
      $$('.pq-tab__t', t.el).forEach(function (el) {
        var b = new R.Bloque({ el: el, W: 3 });
        b.partir(); b.ordenar(); b.escribir(1);
        t.letras[el.parentNode.dataset.for] = b;
      });
    });
    medir();
  }

  /* ---------- el bucle ---------- */
  var sucio = true, ultimaY = null, o = 0, oMeta = 0, ot = 0, otMeta = 0, cuenta = null, enSitio = null;
  function vuelta(t, dms) {
    if (document.hidden || quieto || !listas) return;
    var dt = Math.min(.1, (dms || 16.7) / 1000);
    var y = scrollY();
    var A = auds[aud];
    var anima = pendiente !== null || swap !== meta || cuenta !== null || tabAnim !== null || enSitio !== null ||
      Math.abs(oMeta - o) > 1e-4 || Math.abs(otMeta - ot) > 1e-4 || (A.fase >= 0 && A.fase < 3);
    var cerca = M.top - y < M.vh * 1.2 && M.top + M.alto - y > -M.vh * .2;
    if (!cerca && !anima && !sucio) return;
    if (!sucio && !anima && y === ultimaY) return;
    ultimaY = y; sucio = false;

    // el cambio de público, más arriba: borrar deprisa (.35 s), cambiar, escribir otra vez (.8 s)
    if (swap > meta) swap = Math.max(meta, swap - dt / .35);
    else if (swap < meta) swap = Math.min(meta, swap + dt / .8);
    var cambia = pendiente && (enSitio ? (enSitio.t += dt) >= .25 : swap <= 0);
    if (cambia) {
      // el que sale, borrado del todo: sus letras a medio cruzar llevan visibility: visible y se verían en el panel oculto
      A.bloques.forEach(function (b) { b.b.escribir(0); b.lleno = false; if (b.flecha) b.flecha('0'); if (b.linea) b.linea('0'); });
      reiniciar(A);
      var quieta = !!enSitio;
      enSitio = null;
      aplicar(pendiente); meta = 1;
      A = auds[aud];
      // con la ventana a la vista: el caso nuevo, ya abierto en el mismo sitio (sin la línea); su orden empieza ya
      if (quieta) { o = oMeta = 1; reiniciar(A); }
    }

    var vh = M.vh;
    // los textos: empiezan con su arriba al 98 % de la pantalla (la respuesta, al 94 %) y terminan al 70 %. Una vez
    // completos se quedan completos; solo se deshacen si el bloque vuelve a bajar del punto en que empezó.
    A.bloques.forEach(function (b) {
      var arr = b.top - y, raw = cl((vh * b.start - arr) / (vh * (b.start - .7)));
      if (b.lleno) { if (raw <= 0) b.lleno = false; } else if (raw >= 1) b.lleno = true;
      var P = Math.min(swap, b.lleno ? 1 : raw);
      b.b.escribir(P);
      if (b.flecha) { var f = cl((P - .82) / .18); b.flecha((f * f * (3 - 2 * f)).toFixed(3)); }
      if (b.linea) b.linea(io(cl((P - .6) / .4)).toFixed(3));
    });

    // la ventana: la línea aparece cuando su arriba entra por abajo y termina de abrirse al llegar a donde se queda
    // quieta (centrada): se abre entera a la vista. La línea cruza (la) y se abre (lb).
    // termina un 8 % de pantalla antes de engancharse: con el suavizado, ya está abierta del todo al quedarse quieta
    var wTop = A.winTop - y, abre = cl((vh - wTop) / Math.max(1, vh - A.fin - vh * .08));
    oMeta = Math.min(swap, abre);
    o += (oMeta - o) * (1 - Math.exp(-dt * 12));
    if (Math.abs(oMeta - o) <= 1e-4) o = oMeta;
    var la = io(cl(o / .3)), lb = io(cl((o - .24) / .76));
    var lado = (1 - la) * 50, tb = (1 - lb) * 50, px = (1 - lb) * .5;
    var abierta = la > .9995 && lb > .9995;
    A.clip(abierta ? 'none' : 'inset(calc(' + tb.toFixed(2) + '% - ' + px.toFixed(2) + 'px) ' + lado.toFixed(2) + '% calc(' + tb.toFixed(2) + '% - ' + px.toFixed(2) + 'px) ' + lado.toFixed(2) + '%)');

    // dentro, solo con la ventana abierta del todo: 1) el dispositivo sube (.6 s); 2) a los 200 ms, el nombre y el
    // texto; 3) a continuación (con la ventana visible al 70 %), los anillos, uno tras otro
    if (abierta && A.fase < 0) { A.fase = 0; A.t = 0; A.win.classList.add('is-sube'); }
    if (A.fase >= 0) {
      A.t += dt;
      if (A.fase === 0 && A.t >= .2) { A.fase = 1; A.win.classList.add('is-info'); }
      if (A.fase === 1 && A.t >= .8) A.fase = 2;
      if (A.fase === 2 && (!A.anillos.length || A.contado)) A.fase = 3;
      if (A.fase === 2 && A.ve70 && !A.contado) { A.contado = true; cuenta = { t: 0, A: A }; A.fase = 3; }
    }
    if (o < .02 && !pendiente) reiniciar(A);     // cerrada del todo (al volver a subir): el orden, otra vez

    // la pestaña: aparece al terminar de abrirse la ventana (por el scroll, no por el cambio: mientras la
    // ventana se cierra para cambiar de caso, se queda)
    otMeta = abre;
    ot += (otMeta - ot) * (1 - Math.exp(-dt * 8));
    if (Math.abs(otMeta - ot) <= 1e-4) ot = otMeta;
    var rv = cl((ot - .9) / .1); rv = rv * rv * (3 - 2 * rv);
    tabs.forEach(function (t) { t.op(rv.toFixed(3)); t.tr(rv >= 1 ? 'none' : 'translate3d(0,' + ((1 - rv) * 6).toFixed(2) + 'px,0)'); });
    if (tabAnim) {
      tabAnim.t += dt;
      var tp = cl(tabAnim.t / .5);
      tabs.forEach(function (t) { var b = t.letras[tabAnim.n]; if (b) b.escribir(tp); });
      if (tp >= 1) tabAnim = null;
    }

    // los anillos: de 0 a su valor (1,1 s, ease-out), uno tras otro (120 ms)
    if (cuenta) {
      cuenta.t += dt;
      var fin = true;
      cuenta.A.anillos.forEach(function (d, i) {
        var k = sale(cl((cuenta.t - i * .12) / 1.1));
        if (k < 1) fin = false;
        d.ponB(String(Math.round(d.v * k)));
        d.ponArco((C * (1 - d.v * k / 100)).toFixed(2) + 'px');
      });
      if (fin) { cuenta.A.anillos.forEach(function (d) { d.li.classList.remove('is-contando'); }); cuenta = null; }
    }
  }

  medir();
  addEventListener('resize', medir);
  if (window.ResizeObserver) new ResizeObserver(posiciones).observe(document.body);
  if (document.fonts) document.fonts.ready.then(medir);
  if (!quieto) {
    if (window.gsap) gsap.ticker.add(vuelta); else (function f() { requestAnimationFrame(f); vuelta(); })();
    // las letras se montan en el primer momento libre tras la carga (o ya, si se llega con un ancla)
    var cuando = window.requestIdleCallback || function (fn) { return setTimeout(fn, 300); };
    if (location.hash) montar();
    else addEventListener('load', function () { cuando(montar, { timeout: 2500 }); }, { once: true });
    addEventListener('scroll', function () { montar(); }, { once: true, passive: true });
  }

  EV.paraQuien = { elegir: elegir, medir: medir, montar: montar };
})();
