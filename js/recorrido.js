/* ==========================================================================
   recorrido.js — el motor de las secciones con recorrido lateral de la home
   (desde backup-pre-conquien-lateral; lo común que estaba en js/lateral.js).
   Lo usan js/lateral.js (hacia la izquierda) y js/con-quien.js (hacia la derecha).
   · Pin sticky + pista: alto = pantalla + apertura + recorrido + lo de después.
   · UN scroll suavizado para todas (1 − e^(−9·dt)) en UN callback de gsap.ticker:
     la persiana de #lateral y lo que descubre de #con-quien van al mismo paso.
   · Letras: tres franjas por letra, en orden de lectura; la letra i de un bloque
     avanza clamp((P·(N+W) − i)/W). Solo se escribe lo que cambia.
   · Párrafos con fundido línea a línea (Lineas: opacidad + 8 px, en orden de lectura).
   · Listas ondulantes (un muelle por línea), barra y contador por transform.
   · La cabecera: cada sección dice qué hay bajo la línea del logo; manda la
     primera que lo sabe (van en el orden de la página, la de arriba tapa).
   · Posiciones cacheadas. Nada calcula fuera de pantalla ni con la pestaña oculta.
   Cada sección: EV.recorrido.crear({ … }), ver crear(). Las que quedan lejos se montan con
   EV.recorrido.despues(fn): en el primer momento libre tras la carga, con el primer scroll o
   cuando un ancla las necesita (montarlas en la carga costaba ~45 ms de layout antes del primer pintado).
   ========================================================================== */
(function () {
  var EV = (window.EV = window.EV || {});
  var quieto = EV.mode !== 'cine';              // movimiento reducido o versión fija: sin suavizado, letras ni ondulación
  var SUAVE = 9;                                // el lerp del prototipo
  var K = 300, C = 22 * 1.2, H = 1 / 120;       // el muelle de las listas

  function cl(v) { return v < 0 ? 0 : v > 1 ? 1 : v; }
  function tramo(v, a, b) { return cl((v - a) / (b - a)); }
  function suaviza(t) { return t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; }   // ease-in-out
  function scrollY() { var l = EV.home && EV.home.lenis; return l ? l.scroll : window.scrollY; }
  function irA(y) {
    var l = EV.home && EV.home.lenis;
    if (l) l.scrollTo(y, { immediate: true, force: true }); else window.scrollTo(0, y);
  }
  function arribaDe(el) { var y = 0, n = el; while (n) { y += n.offsetTop; n = n.offsetParent; } return y; }
  // escribe un estilo solo si cambia
  function escritor(el, prop) {
    var ultimo;
    return function (v) { if (v !== ultimo) { ultimo = v; el.style[prop] = v; } };
  }

  /* ==========================================================================
     Un bloque de letras
     { el: el bloque (aria-label), piezas: sus líneas lógicas, W: cuántas letras entran a la vez }
     ========================================================================== */
  var molde = document.createElement('span');
  molde.className = 'sc';
  ['m', 's s1', 's s2', 's s3'].forEach(function (c) { var s = document.createElement('span'); s.className = c; molde.appendChild(s); });

  function Bloque(o) {
    this.el = o.el;
    this.piezas = o.piezas || [o.el];
    this.W = o.W;
    this.letras = [];
    this.orden = [];
    this.palabras = null;
    this.P = -1;
    this.hecho = quieto;
  }
  // En dos pasos, para que ninguna tarea sea larga: primero las palabras y luego sus letras, a trozos.
  Bloque.prototype.empezar = function () {
    var b = this, textos = b.piezas.map(function (el) { return el.textContent.replace(/\s+/g, ' ').trim(); });
    b.el.setAttribute('aria-label', textos.join(', '));
    b.palabras = [];
    b.piezas.forEach(function (el, fila) {
      var fr = document.createDocumentFragment();
      // aria-label no se anuncia en <p>, <span> ni <li>: el texto entero queda también para el lector
      var sr = document.createElement('span');
      sr.className = 'sr-only';
      sr.textContent = textos[fila];
      fr.appendChild(sr);
      function palabra(texto, dibujo) {
        var w = document.createElement('span');
        w.className = dibujo ? 'sw sw--dibujo' : 'sw';
        w.setAttribute('aria-hidden', 'true');
        if (dibujo) w.appendChild(dibujo.cloneNode(true)); else w.textContent = texto;
        b.palabras.push({ w: w, texto: texto, dibujo: dibujo, fila: fila });
        fr.appendChild(w);
      }
      [].forEach.call(el.childNodes, function (nodo) {
        if (nodo.nodeName === 'BR') { fr.appendChild(document.createElement('br')); return; }
        if (nodo.nodeName.toLowerCase() === 'svg') { palabra('', nodo); return; }   // una flecha cuenta como una letra
        // solo los espacios normales separan palabras: el &nbsp; de "150 €" no
        nodo.textContent.split(/([ \t\n\r]+)/).forEach(function (t) {
          if (!t) return;
          if (/^[ \t\n\r]+$/.test(t)) fr.appendChild(document.createTextNode(' '));
          else palabra(t);
        });
      });
      el.textContent = '';
      el.appendChild(fr);
    });
  };
  Bloque.prototype.montar = function (cuantas) {
    var n = 0;
    while (n < cuantas && this.palabras.length) {
      var p = this.palabras.shift(), signos = p.dibujo ? [p.dibujo] : Array.from(p.texto);
      p.w.textContent = '';
      for (var j = 0; j < signos.length; j++) {
        var c = molde.cloneNode(true), k = c.children;
        for (var i = 0; i < 4; i++) {
          if (p.dibujo) k[i].appendChild(signos[j].cloneNode(true)); else k[i].textContent = signos[j];
        }
        p.w.appendChild(c);
        this.letras.push({ c: c, m: k[0], s1: k[1], s2: k[2], s3: k[3], fila: p.fila, q: 0, cruza: false, seVe: false });
        n++;
      }
    }
    if (this.palabras.length) return;
    this.hecho = true;
    this.orden = this.letras.slice();
    this.P = -1;
  };
  Bloque.prototype.partir = function () {
    if (this.hecho) return;
    if (!this.palabras) this.empezar();
    this.montar(Infinity);
  };
  // línea a línea (de arriba abajo) y, en cada línea, de izquierda a derecha
  Bloque.prototype.ordenar = function () {
    if (!this.letras.length) return;
    this.letras.forEach(function (l) { var r = l.c.getBoundingClientRect(); l.x = r.left; l.y = r.top; l.h = r.height; });
    var porAlto = this.letras.slice().sort(function (a, z) { return a.fila - z.fila || a.y - z.y; });
    var linea = -1, ant = null;
    porAlto.forEach(function (l) {
      if (!ant || l.fila !== ant.fila || l.y - ant.y > l.h * .4) { linea++; ant = l; }
      l.linea = linea;
    });
    this.orden = porAlto.sort(function (a, z) { return a.linea - z.linea || a.x - z.x; });
    this.P = -1;
  };
  Bloque.prototype.escribir = function (P) {
    if (P === this.P) return;
    this.P = P;
    var N = this.orden.length, v = P * (N + this.W);
    for (var i = 0; i < N; i++) pintar(this.orden[i], cl((v - i) / this.W));
  };

  /* ==========================================================================
     Un párrafo que aparece línea a línea (opacidad + 8 px), en orden de lectura
     { el, tipo: 'lineas', W: cuántas líneas a la vez }. Las palabras son
     inline-block: el texto sigue siendo el mismo para el lector (sin aria-label).
     ========================================================================== */
  function Lineas(o) {
    this.el = o.el;
    this.W = o.W || 1.3;
    this.palabras = null;                     // así lo trata el montaje en reposo: un solo paso
    this.trozos = [];
    this.lineas = [];
    this.P = -1;
    this.hecho = quieto;
  }
  Lineas.prototype.empezar = function () {
    if (this.hecho) return;
    var el = this.el, fr = document.createDocumentFragment(), t = this.trozos;
    [].forEach.call(el.childNodes, function (nodo) {
      if (nodo.nodeName === 'BR') { fr.appendChild(document.createElement('br')); return; }
      nodo.textContent.split(/([ \t\n\r]+)/).forEach(function (p) {
        if (!p) return;
        if (/^[ \t\n\r]+$/.test(p)) { fr.appendChild(document.createTextNode(' ')); return; }
        var w = document.createElement('span');
        w.className = 'pl';
        w.textContent = p;
        t.push({ w: w, op: escritor(w, 'opacity'), tr: escritor(w, 'transform') });
        fr.appendChild(w);
      });
    });
    el.textContent = '';
    el.appendChild(fr);
    this.hecho = true;
  };
  Lineas.prototype.montar = function () { this.empezar(); };
  Lineas.prototype.partir = function () { this.empezar(); };
  Lineas.prototype.ordenar = function () {
    if (!this.trozos.length) return;
    var lineas = [], ant = null;
    this.trozos.forEach(function (t) {
      var y = t.w.offsetTop;
      if (ant === null || Math.abs(y - ant) > 2) { lineas.push([]); ant = y; }
      lineas[lineas.length - 1].push(t);
    });
    this.lineas = lineas;
    this.P = -1;
  };
  Lineas.prototype.escribir = function (P) {
    if (P === this.P || !this.lineas.length) return;
    this.P = P;
    var N = this.lineas.length, v = P * (N + this.W);
    for (var i = 0; i < N; i++) {
      var q = cl((v - i) / this.W), e = q * q * (3 - 2 * q);
      var op = e.toFixed(3), tr = e === 1 ? 'none' : 'translate3d(0,' + (8 * (1 - e)).toFixed(2) + 'px,0)';
      this.lineas[i].forEach(function (t) { t.op(op); t.tr(tr); });
    }
  };

  function pintar(l, q) {
    if (q === l.q || (q > 0 && q < 1 && Math.abs(q - l.q) < .004)) return;
    l.q = q;
    var a = cl((q - .3) / .55), sm = a * a * (3 - 2 * a);
    l.m.style.opacity = sm.toFixed(3);
    l.m.style.filter = sm > 0 && sm < 1 ? 'blur(' + ((1 - sm) * 8).toFixed(1) + 'px)' : '';
    var seVe = sm > 0, cruza = q > 0 && q < 1;
    if (seVe !== l.seVe) { l.seVe = seVe; l.m.style.visibility = seVe ? 'visible' : ''; }
    if (cruza !== l.cruza) { l.cruza = cruza; l.s1.style.visibility = l.s2.style.visibility = l.s3.style.visibility = cruza ? 'visible' : ''; }
    if (!cruza) return;                         // las franjas solo se escriben mientras cruzan
    franja(l.s1, cl(q / .6), 1);
    franja(l.s2, cl((q - .1) / .6), -1);
    franja(l.s3, cl((q - .2) / .6), 1);
  }
  function franja(s, k, dir) {
    s.style.transform = 'translateX(' + (dir * (200 * k - 100)).toFixed(1) + '%)';
    s.style.opacity = Math.sin(Math.PI * k).toFixed(3);
  }

  /* ==========================================================================
     Una sección
       sec         la sección (.lateral)
       sentido     -1: la pista va a la izquierda · 1: a la derecha
       bloques     [{ el, piezas, W }]
       listas      las <ul> que ondulan
       alCargar    true: las letras se montan en reposo tras la carga · false: desde el primer scroll
       tramos(r)   tras medir: r.apertura, r.despues (animado), r.cola (quieto, solo tiempo), r.desde (v mínimo)
       recorrido(r)  px que recorre la pista
       medir(r)    lo propio de la sección tras medir
       animar(r, dt) lo que va por tiempo; true mientras se mueve
       dibujar(r)  con r.v (scroll suavizado en la sección), r.s (el real), r.x (px de pista) y r.p (0–1).
                   Devuelve lo que hay bajo la cabecera: { clara, naranja, lisa, franja: 'izq' | 'der' } o null.
       empuje(r)   opcional: px de más que se aparta la pista
       amplitud    opcional: la ondulación de las listas (1 = la del prototipo)
     ========================================================================== */
  var secciones = [];
  var cabEl = document.querySelector('.cabecera'), marca = document.querySelector('.cabecera__marca');
  var cabecera = { medio: 32, marcaX: 90 };
  function medirCabecera() {
    if (!cabEl) return;
    var r = cabEl.getBoundingClientRect();
    cabecera.medio = r.top + r.height / 2;
    if (marca) { var m = marca.getBoundingClientRect(); cabecera.marcaX = m.left + m.width / 2; }
  }

  function Seccion(o) {
    var q = function (s) { return o.sec.querySelector(s); };
    this.o = o;
    this.sec = o.sec;
    this.id = o.sec.id;
    this.pin = q('.lat-pin');
    this.win = q('.lat-window');
    this.track = q('.lat-track');
    this.ponPista = escritor(this.track, 'transform');
    this.ponBarra = escritor(q('.lat-bar i'), 'transform');
    this.bloques = o.bloques.map(function (b) { return b.tipo === 'lineas' ? new Lineas(b) : new Bloque(b); });

    // la ondulación: cada lista, sus fases
    var items = this.items = [];
    (o.listas || []).forEach(function (ul) {
      [].forEach.call(ul.children, function (li, i) {
        items.push({ pon: escritor(li, 'transform'), fase: (35 * i - 180) * Math.PI / 180, x: 0, v: 0, meta: 0 });
      });
    });

    // el contador: cada cifra es una columna 0–9 que se mueve con transform
    var count = q('.lat-count b');
    count.textContent = '';
    this.cifras = [0, 1, 2].map(function () {
      var caja = document.createElement('span'), col = document.createElement('span');
      caja.className = 'lat-cifra';
      col.textContent = '0\n1\n2\n3\n4\n5\n6\n7\n8\n9';
      caja.appendChild(col); count.appendChild(caja);
      return { mueve: escritor(col, 'transform'), ve: escritor(caja, 'opacity') };
    });

    this.vw = this.h = this.alto = this.centro = this.top = this.run = 0;
    this.apertura = this.despues = this.cola = this.desde = this.fin = this.largo = 0;
    this.altoAntes = null;
    this.sucio = true;
    this.dentro = null;
    this.ondulando = false;
    this.cab = null;
    this.v = this.s = this.x = this.p = 0;
    this.ultimaY = this.ultimaS = null;
  }

  Seccion.prototype.medirArriba = function () {
    var y = arribaDe(this.sec);
    if (y !== this.top) { this.top = y; this.sucio = true; }
  };
  Seccion.prototype.medir = function () {
    var o = this.o;
    this.vw = document.documentElement.clientWidth;
    this.h = this.pin.offsetHeight;
    this.alto = window.innerHeight;
    this.centro = Math.round(this.alto / 2);
    this.amp = Math.min(this.vw * .11, 150) * (o.amplitud || 1);
    o.tramos(this);
    this.run = Math.max(0, o.recorrido(this));
    this.fin = this.apertura + this.run + this.despues;
    this.largo = this.h + this.fin + this.cola;
    if (o.medir) o.medir(this);
    this.bloques.forEach(function (b) { b.ordenar(); });

    if (this.altoAntes !== this.largo) {
      var antes = this.altoAntes, y = scrollY(), pasada = antes !== null && y >= this.top + antes;
      this.altoAntes = this.largo;
      this.sec.style.height = this.largo + 'px';
      // Lenis tarda 250 ms en enterarse: sin esto un salto a un ancla de más abajo se queda corto
      if (EV.home && EV.home.lenis) EV.home.lenis.resize();
      // si la sección ya quedó arriba, lo que se está leyendo no se mueve
      if (pasada) { irA(y + this.largo - antes); suave = null; }
    }
    this.medirArriba();
    this.sucio = true;
  };
  Seccion.prototype.preparar = function () {
    var falta = this.bloques.filter(function (b) { return !b.hecho; });
    if (!falta.length) return;
    falta.forEach(function (b) { b.partir(); });
    this.medir();
    secciones.forEach(function (r) { r.medirArriba(); });
  };

  Seccion.prototype.ondular = function (dt, deGolpe) {
    var mueve = false, pasos = Math.max(1, Math.ceil(dt / H)), dd = dt / pasos;
    for (var i = 0; i < this.items.length; i++) {
      var it = this.items[i];
      if (deGolpe || (Math.abs(it.meta - it.x) < .05 && Math.abs(it.v) < .1)) { it.x = it.meta; it.v = 0; }
      else {
        for (var j = 0; j < pasos; j++) { it.v += (K * (it.meta - it.x) - C * it.v) * dd; it.x += it.v * dd; }
        mueve = true;
      }
      it.pon(quieto ? 'none' : 'translate3d(' + it.x.toFixed(1) + 'px,0,0)');
    }
    return mueve;
  };
  Seccion.prototype.dibujar = function () {
    var o = this.o, x = Math.min(this.run, Math.max(0, this.v - this.apertura)), p = this.run ? x / this.run : 0;
    this.x = x;
    this.p = p;
    var cab = o.dibujar(this);
    this.ponPista('translate3d(' + (o.sentido * (x + (o.empuje ? o.empuje(this) : 0))).toFixed(1) + 'px,0,0)');
    this.ponBarra('scaleX(' + p.toFixed(4) + ')');
    var n = Math.round(p * 100);
    for (var k = 0; k < 3; k++) this.cifras[k].mueve('translateY(' + -18 * (Math.floor(n / [100, 10, 1][k]) % 10) + 'px)');
    this.cifras[0].ve(n === 100 ? '1' : '0');
    for (var i = 0; i < this.items.length; i++) this.items[i].meta = quieto ? 0 : Math.cos(p * 6.2 + this.items[i].fase) * this.amp;
    return cab;
  };
  Seccion.prototype.enPantalla = function (y) {
    var s = y - this.top;
    return s > 1 - this.alto && s < this.largo;
  };
  Seccion.prototype.paso = function (y, Y, dt) {
    var en = this.enPantalla(y);
    var anima = this.o.animar ? this.o.animar(this, dt) : false;
    if (!en && this.dentro === false && !this.sucio && !anima) return;     // fuera de pantalla no se calcula nada
    var entra = en && !this.dentro;
    if (entra) this.preparar();
    if (en !== this.dentro) this.sec.classList.toggle('en-pantalla', en);
    var cambia = en !== this.dentro;
    this.dentro = en;
    if (!cambia && !this.sucio && !anima && !this.ondulando && y === this.ultimaY && Y === this.ultimaS) return;
    this.ultimaY = y;
    this.ultimaS = Y;
    this.sucio = false;
    this.s = y - this.top;
    this.v = Math.min(this.fin, Math.max(this.desde, (en ? Y : y) - this.top));
    var cab = this.dibujar();
    this.cab = en ? cab : null;
    this.ondulando = this.ondular(dt, quieto || !en || entra);
  };

  /* ==========================================================================
     El bucle, la cabecera y el montaje de las letras en reposo
     ========================================================================== */
  var pendientes = [];
  function montarPendientes() { while (pendientes.length) pendientes.shift()(); }

  var suave = null, clara = false, naranja = false, lisa = false, lado = null, cargada = false, bajado = false;

  function ponCabecera() {
    if (!cabEl) return;
    var c = null;
    for (var i = 0; i < secciones.length && !c; i++) c = secciones[i].cab;
    var nClara = !!(c && c.clara), nLisa = !!(c && c.lisa), nLado = (c && c.franja) || null;
    var nNaranja = !!(c && c.naranja);
    if (nNaranja !== naranja) { naranja = nNaranja; cabEl.classList.toggle('is-naranja', naranja); }
    if (nLisa !== lisa) { lisa = nLisa; cabEl.classList.toggle('is-lisa', lisa); }
    if (nLado !== lado) {
      lado = nLado;
      cabEl.classList.toggle('is-franja', lado === 'der');
      cabEl.classList.toggle('is-franja-izq', lado === 'izq');
    }
    if (nClara !== clara) {
      clara = nClara;
      EV.cabeceraClara = clara;
      if (EV.home && EV.home.refrescar) EV.home.refrescar();
    }
  }

  function vuelta(tiempo, dms) {
    if (document.hidden || !secciones.length) return;
    var y = scrollY(), alguna = false, i;
    for (i = 0; i < secciones.length; i++) if (secciones[i].enPantalla(y)) alguna = true;
    var ms = dms || 16.7, dt = Math.min(.05, ms / 1000);
    // un salto de varias pantallas no se recorre: se aparece allí
    var salto = suave !== null && Math.abs(y - suave) > 3 * secciones[0].h;
    if (quieto || !alguna || suave === null || salto || Math.abs(y - suave) < .1) suave = y;
    else suave += (y - suave) * (1 - Math.exp(-dt * SUAVE));
    for (i = 0; i < secciones.length; i++) secciones[i].paso(y, suave, dt);
    ponCabecera();
    if (!bajado && y > 2) { bajado = true; montarPendientes(); if (cargada) enReposo(); }
  }

  // Las letras se montan en momentos libres, unas 24 cada vez (de una sola vez era una tarea de ~100 ms):
  // las de alCargar, tras la carga; las demás, desde el primer scroll. Si el usuario llega antes (o salta
  // a un ancla), preparar() termina lo que falte.
  var montando = false;
  function enReposo() {
    if (montando) return;
    montando = true;
    var turno = window.requestIdleCallback || function (fn) { return setTimeout(fn, 60); };
    turno(function () {
      montando = false;
      for (var i = 0; i < secciones.length; i++) {
        var r = secciones[i];
        if (!r.o.alCargar && !bajado) continue;
        var falta = r.bloques.filter(function (b) { return !b.hecho; }), b = falta[0];
        if (!b) continue;
        if (b.palabras) b.montar(24); else b.empezar();
        if (b.hecho && falta.length === 1) { r.medir(); secciones.forEach(function (o) { o.medirArriba(); }); }
        enReposo();
        return;
      }
    }, { timeout: 3000 });
  }

  function medirTodas() {
    medirCabecera();
    secciones.forEach(function (r) { r.medir(); });
    secciones.forEach(function (r) { r.medirArriba(); });
    suave = null;                               // sin suavizar desde un sitio que ya no existe
  }
  function alCambiar() {
    var vw = document.documentElement.clientWidth;
    // la barra del móvil solo mueve el centro de la pantalla: no hace falta volver a medir las letras
    if (secciones.every(function (r) { return r.vw === vw && r.pin.offsetHeight === r.h; })) {
      secciones.forEach(function (r) { r.alto = window.innerHeight; r.centro = Math.round(r.alto / 2); r.sucio = true; });
    } else medirTodas();
  }

  function escuchar() {
    addEventListener('resize', alCambiar);
    if (window.ResizeObserver) new ResizeObserver(function () { secciones.forEach(function (r) { r.medirArriba(); }); }).observe(document.body);
    if (document.fonts) {
      document.fonts.ready.then(medirTodas);
      if (document.fonts.addEventListener) document.fonts.addEventListener('loadingdone', medirTodas);
    }
    if (window.gsap) gsap.ticker.add(vuelta);
    else (function bucle() { requestAnimationFrame(bucle); vuelta(); })();
    var lista = function () {
      cargada = true;
      (window.requestIdleCallback || function (fn) { return setTimeout(fn, 200); })(function () { montarPendientes(); enReposo(); }, { timeout: 2000 });
      enReposo();
    };
    if (document.readyState === 'complete') lista(); else addEventListener('load', lista, { once: true });
  }

  function de(id) {
    for (var i = 0; i < secciones.length; i++) if (secciones[i].id === id) return secciones[i];
    return null;
  }

  EV.recorrido = {
    quieto: quieto,
    cabecera: cabecera,
    util: { cl: cl, tramo: tramo, suaviza: suaviza, escritor: escritor, scrollY: scrollY, irA: irA },
    // los efectos de texto, para las secciones que no son un recorrido (js/para-quien.js)
    Bloque: Bloque,
    Lineas: Lineas,
    de: de,
    crear: function (o) {
      var r = new Seccion(o);
      o.sec.classList.add('is-viva');           // antes de medir
      if (!secciones.length) { escuchar(); medirCabecera(); }
      secciones.push(r);
      r.medir();
      if (location.hash) r.preparar();
      vuelta();
      return r;
    },
    despues: function (fn) {
      if (location.hash || cargada && bajado) fn(); else pendientes.push(fn);
    },
    // todas con su alto definitivo (antes de calcular a dónde salta un ancla)
    preparar: function () { montarPendientes(); secciones.forEach(function (r) { r.preparar(); }); },
    // a dónde lleva su ancla: abierta y con el titular escrito. null = no es una de estas secciones
    destino: function (id) {
      montarPendientes();
      var r = de(id);
      if (!r) return null;
      r.medirArriba();
      return r.top + r.apertura;
    }
  };
})();
