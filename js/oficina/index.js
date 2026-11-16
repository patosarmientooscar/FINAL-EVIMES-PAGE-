/* ==========================================================================
   oficina/index.js — arranque de "Trabajo selecto" + la oficina (#oficina-slot).
   · Textos: js/data/oficina.js (BORRADOR) → [data-of]. "[palabra]" = en cian.
   · El enlace real a Disco es el botón "Ver la web →" de cap2 (y la card
     del canvas abre la misma web al hacer clic).
   · Three.js y el panorama se cargan con la sección a 1 pantalla (IO con
     rootMargin); mientras, la ventana enseña la foto desenfocada (WebP).
   · Un solo bucle (dentro de gsap.ticker, el bucle único de la web; si no
     hay GSAP, requestAnimationFrame) que se para con la sección fuera (IO).
   · El progreso sale de Lenis (posiciones cacheadas, sin leer el layout en
     cada fotograma) y se suaviza en timeline.js.
   · Mientras la ventana cubre la pantalla, cabecera oscura (EV.cabeceraOscura,
     la lee home.js); el fondo de tubos ya va a opacidad 0 y sin render sobre
     el panel gris (home.js).
   · Versión fija (movimiento reducido, ahorro de datos, ?modo=fijo) o sin
     WebGL: la oficina en una card con la web de Disco encima, el texto y el enlace.
   · ?oficina=captura: rehace esa foto y la posición de la card (window.__oficinaCaptura).
   ========================================================================== */
import { PROJECT, FIJA } from './config.js';

const EV = (window.EV = window.EV || {});
const track = document.querySelector('[data-oficina]');
if (track) init();

function init() {
  textos();
  const captura = new URLSearchParams(location.search).get('oficina') === 'captura';
  if (!captura && (EV.mode === 'still' || !hayWebGL())) { fija(); return; }
  const cerca = new IntersectionObserver(es => {
    if (!es.some(e => e.isIntersecting)) return;
    cerca.disconnect();
    arrancar(captura).catch(err => { console.warn('[oficina]', err); fija(); });
  }, { rootMargin: '100% 0px' });
  cerca.observe(track);
}

function esc(s) { return String(s || '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])); }
function textos() {
  const T = window.EVIMES_OFICINA; if (!T) return;
  document.querySelectorAll('[data-of]').forEach(el => {
    const v = el.dataset.of.split('.').reduce((o, k) => (o ? o[k] : undefined), T);
    if (typeof v !== 'string' || !v) return;
    el.innerHTML = esc(v).replace(/\[([^\]]+)\]/g, '<span class="accent">$1</span>');
  });
}

function hayWebGL() {
  try { const c = document.createElement('canvas'); return !!(window.WebGLRenderingContext && (c.getContext('webgl2') || c.getContext('webgl'))); }
  catch (e) { return false; }
}

/* ---------- versión fija: la oficina en card + la web de Disco encima ---------- */
function fija() {
  track.classList.add('is-fija');
  const win = track.querySelector('.window');
  const vista = (k, F) => { const r = F.card;
    return `<div class="fija fija--${k}" style="--ar:${F.ar}">
      <img class="fija__foto" src="${F.img}" alt="La oficina de Evimes: la mesa con el monitor encendido y la pared navy con EVIMES en cian." loading="lazy" decoding="async">
      <a class="fweb" href="${PROJECT.url}" target="_blank" rel="noopener" tabindex="-1" aria-hidden="true" style="left:${r.x}%;top:${r.y}%;width:${r.w}%;height:${r.h}%;background-image:url(${PROJECT.strip});background-size:100% ${PROJECT.frames * 100}%"></a></div>`; };
  const div = document.createElement('div');
  div.className = 'fija-vistas';
  div.innerHTML = vista('escritorio', FIJA.escritorio) + vista('movil', FIJA.movil);
  win.prepend(div);
}

/* ---------- la oficina en vivo ---------- */
async function arrancar(captura) {
  const [{ crearEscena, THREE }, { crearCard }, { crearTimeline }] = await Promise.all([import('./scene.js'), import('./card.js'), import('./timeline.js')]);
  const win = track.querySelector('.window'), cv = win.querySelector('canvas');
  const dom = { win, caps: [win.querySelector('[data-cap="1"]'), win.querySelector('[data-cap="2"]')], scrim: win.querySelector('.scrim'), hud: win.querySelector('.hud'), flash: win.querySelector('.flash') };
  const movil = Math.min(innerWidth, innerHeight) < 700 || matchMedia('(pointer: coarse)').matches;
  const E = crearEscena(cv, { captura, movil });
  const K = crearCard(E);
  const tl = crearTimeline(E, K, dom, { reduce: !!EV.reducedMotion });
  E.panoListo.then(() => win.classList.add('is-lista')).catch(() => {});

  // medidas cacheadas: el progreso sale del scroll de Lenis sin leer el layout por fotograma
  let top = 0, alto = 1, vh = innerHeight;
  const scrollY = () => { const l = EV.home && EV.home.lenis; return l ? l.scroll : window.scrollY; };
  const medir = () => { const r = track.getBoundingClientRect(); top = r.top + scrollY(); alto = r.height; vh = innerHeight; tl.resize(win.clientWidth || innerWidth, win.clientHeight || innerHeight); };
  medir();
  addEventListener('resize', medir);
  new ResizeObserver(medir).observe(document.querySelector('main') || document.body);
  const leer = () => { const y = scrollY(); tl.progreso((y - top) / Math.max(1, alto - vh)); return y; };

  // Solo lectura (QA y otros módulos): el progreso de la oficina.
  EV.oficina = { get P() { return tl.P; }, get hover() { return tl.hovered; } };
  let running = false, cursor = false;
  addEventListener('pointermove', e => tl.puntero(e), { passive: true });
  cv.addEventListener('click', () => { if (tl.hovered) window.open(PROJECT.url, '_blank', 'noopener'); });

  if (captura) {
    await Promise.all([E.listo, K.listo, document.fonts.ready]);
    const v = new THREE.Vector3();
    window.__oficinaCaptura = (p = .76) => {
      medir(); tl.asentar(p); E.camera.updateMatrixWorld(); K.g.updateMatrixWorld(true);
      let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
      [[-.5, -.5], [.5, -.5], [.5, .5], [-.5, .5]].forEach(([x, y]) => { v.set(x * K.cw, y * K.ch, 0).applyMatrix4(K.face.matrixWorld).project(E.camera);
        const px = (v.x + 1) / 2 * 100, py = (1 - v.y) / 2 * 100; x0 = Math.min(x0, px); x1 = Math.max(x1, px); y0 = Math.min(y0, py); y1 = Math.max(y1, py); });
      K.g.visible = false; E.renderer.render(E.scene, E.camera);
      const img = E.renderer.domElement.toDataURL('image/png'); K.g.visible = true;
      return { img, card: { x: +x0.toFixed(2), y: +y0.toFixed(2), w: +(x1 - x0).toFixed(2), h: +(y1 - y0).toFixed(2) } };
    };
    // QA: asentar y pintar en un progreso concreto
    window.__oficinaIr = p => { medir(); tl.asentar(p); E.renderer.render(E.scene, E.camera); };
    return;
  }

  new IntersectionObserver(es => { running = es[0].isIntersecting; if (!running) EV.cabeceraOscura = false; }, { rootMargin: '200px' }).observe(track);
  const frame = dt => {
    if (!running) return;
    const y = leer();
    tl.update(dt);
    E.renderer.render(E.scene, E.camera);
    if (tl.hovered !== cursor) { cursor = tl.hovered; cv.style.cursor = cursor ? 'pointer' : ''; }
    // cabecera oscura mientras la ventana abierta cubre su franja
    EV.cabeceraOscura = tl.abierta > .5 && (top + alto - y) > 90;
  };
  if (window.gsap) gsap.ticker.add((time, dms) => frame(Math.min(.05, (dms || 16.7) / 1000)));
  else { let last = performance.now(); const f = now => { requestAnimationFrame(f); const dt = Math.min(.05, (now - last) / 1000); last = now; frame(dt); }; requestAnimationFrame(f); }
}
