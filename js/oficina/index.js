/* ==========================================================================
   oficina/index.js — arranque de "Trabajo selecto" + la oficina (#oficina-slot).
   · Textos: js/data/oficina.js (BORRADOR) → [data-of]. Proyectos: config.js.
   · Las 4 cards también son enlaces reales del DOM (teclado y lectores).
   · Three.js y el panorama se cargan con la sección a 1 pantalla (IO con
     rootMargin); mientras, la ventana enseña la foto desenfocada (WebP).
   · Un solo bucle (dentro de gsap.ticker, el bucle único de la web; si no
     hay GSAP, requestAnimationFrame) que se para con la sección fuera.
   · El progreso sale de Lenis (posiciones cacheadas, sin leer el layout en
     cada fotograma) y se suaviza como en el prototipo (timeline.js).
   · Sobre la oficina, cabecera oscura (EV.cabeceraOscura, la lee home.js).
   · Versión fija (movimiento reducido, ahorro de datos, ?modo=fijo) o sin
     WebGL: foto fija de la oficina con las cards encima del monitor, en HTML.
   · ?oficina=captura: rehace esa foto y la posición de las cards.
   ========================================================================== */
import { PROJECTS, FIJA } from './config.js';

const EV = (window.EV = window.EV || {});
const track = document.querySelector('[data-oficina]');
if (track) init();

function init() {
  textos();
  enlaces();
  const captura = new URLSearchParams(location.search).get('oficina') === 'captura';
  if (!captura && (EV.mode === 'still' || !hayWebGL())) { fija(); return; }
  const cerca = new IntersectionObserver(es => {
    if (!es.some(e => e.isIntersecting)) return;
    cerca.disconnect();
    arrancar(captura).catch(err => { console.warn('[oficina]', err); fija(); });
  }, { rootMargin: '100% 0px' });
  cerca.observe(track);
}

function textos() {
  const T = window.EVIMES_OFICINA; if (!T) return;
  document.querySelectorAll('[data-of]').forEach(el => {
    const v = el.dataset.of.split('.').reduce((o, k) => (o ? o[k] : undefined), T);
    if (typeof v === 'string' && v) el.textContent = v;
  });
}

function enlaces() {
  const ul = track.querySelector('[data-oficina-enlaces]'); if (!ul) return;
  ul.innerHTML = PROJECTS.map(p => p.url
    ? `<li><a href="${p.url}" target="_blank" rel="noopener">${esc(p.title)} <span>· ${esc(p.sub)} (abre en una pestaña nueva)</span></a></li>`
    : `<li><span>${esc(p.title)} · ${esc(p.sub)}</span></li>`).join('');
}
function esc(s) { return String(s || '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])); }

function hayWebGL() {
  try { const c = document.createElement('canvas'); return !!(window.WebGLRenderingContext && (c.getContext('webgl2') || c.getContext('webgl'))); }
  catch (e) { return false; }
}

/* ---------- versión fija: foto + cards en HTML encima del monitor ---------- */
function fija() {
  track.classList.add('is-fija');
  const win = track.querySelector('.window');
  const card = (p, i, r) => {
    const n = String(i + 1).padStart(2, '0') + ' / ' + String(PROJECTS.length).padStart(2, '0');
    const dentro = `<span class="fcard__in"><span class="fcard__img">${p.soon ? '<span class="fcard__horno">En el horno</span>' : `<img src="${p.img}" alt="" loading="lazy" decoding="async">`}</span>
      <span class="fcard__num">${n}</span><span class="fcard__t display">${esc(p.title)}</span><span class="fcard__s">${esc(p.sub)}</span>
      ${p.url ? '<span class="fcard__btn">Ver web →</span>' : '<span class="fcard__pronto">Muy pronto aquí</span>'}</span>`;
    const pos = r ? ` style="left:${r.x}%;top:${r.y}%;width:${r.w}%;height:${r.h}%"` : '';
    return p.url
      ? `<a class="fcard${p.soon ? ' fcard--soon' : ''}" href="${p.url}" target="_blank" rel="noopener"${pos} aria-label="${esc(p.title)}, ${esc(p.sub)} (abre en una pestaña nueva)">${dentro}</a>`
      : `<div class="fcard fcard--soon fcard--h${p.hue}"${pos}>${dentro}</div>`;
  };
  const vista = (k, F) => `<div class="fija fija--${k}" style="--ar:${F.ar}">
      <img class="fija__foto" src="${F.img}" alt="La oficina de Evimes: la mesa con el monitor, la taza y la pared navy con EVIMES grabado." loading="lazy" decoding="async">
      <div class="fija__cards">${PROJECTS.map((p, i) => card(p, i, F.cards[i])).join('')}</div></div>`;
  const div = document.createElement('div');
  div.className = 'fija-vistas';
  div.innerHTML = vista('escritorio', FIJA.escritorio) + vista('movil', FIJA.movil);
  win.prepend(div);
}

/* ---------- la oficina en vivo ---------- */
async function arrancar(captura) {
  const [{ crearEscena, THREE }, { crearCards }, { crearTimeline }] = await Promise.all([import('./scene.js'), import('./cards.js'), import('./timeline.js')]);
  const win = track.querySelector('.window'), cv = win.querySelector('canvas');
  const dom = { win, caps: [win.querySelector('[data-cap="1"]'), win.querySelector('[data-cap="2"]')], scrim: win.querySelector('.scrim'), hud: win.querySelector('.hud') };
  const E = crearEscena(cv, { captura });
  const C = crearCards(E);
  const tl = crearTimeline(E, C, dom, { reduce: !!EV.reducedMotion });
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
  EV.oficina = { get P() { return tl.P; } };
  let running = false;
  addEventListener('pointermove', e => tl.puntero(e), { passive: true });
  addEventListener('click', () => { const h = tl.hovered; if (running && h && h.p.url && tl.P > .55 && tl.P < .92) window.open(h.p.url, '_blank', 'noopener'); });

  if (captura) {
    await Promise.all([E.listo, C.imgsListas, document.fonts.ready]);
    const v = new THREE.Vector3();
    window.__oficinaCaptura = (p = .78) => {
      medir(); tl.asentar(p); E.camera.updateMatrixWorld();
      const rects = C.cards.map(c => { c.g.updateMatrixWorld(true); let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
        [[-.5, -.625], [.5, -.625], [.5, .625], [-.5, .625]].forEach(([x, y]) => { v.set(x, y, 0).applyMatrix4(c.face.matrixWorld).project(E.camera);
          const px = (v.x + 1) / 2 * 100, py = (1 - v.y) / 2 * 100; x0 = Math.min(x0, px); x1 = Math.max(x1, px); y0 = Math.min(y0, py); y1 = Math.max(y1, py); });
        return { x: +x0.toFixed(2), y: +y0.toFixed(2), w: +(x1 - x0).toFixed(2), h: +(y1 - y0).toFixed(2) }; });
      C.cards.forEach(c => { c.g.visible = false; });
      E.renderer.render(E.scene, E.camera);
      const img = E.renderer.domElement.toDataURL('image/png');
      C.cards.forEach(c => { c.g.visible = true; });
      return { img, rects };
    };
    return;
  }

  new IntersectionObserver(es => { running = es[0].isIntersecting; if (!running) EV.cabeceraOscura = false; }, { rootMargin: '200px' }).observe(track);
  const frame = dt => {
    if (!running) return;
    const y = leer();
    tl.update(dt);
    E.renderer.render(E.scene, E.camera);
    // cabecera oscura mientras la ventana abierta cubre su franja
    EV.cabeceraOscura = tl.abierta > .5 && (top + alto - y) > 90;
  };
  if (window.gsap) gsap.ticker.add((time, dms) => frame(Math.min(.05, (dms || 16.7) / 1000)));
  else { let last = performance.now(); const f = now => { requestAnimationFrame(f); const dt = Math.min(.05, (now - last) / 1000); last = now; frame(dt); }; requestAnimationFrame(f); }
}
