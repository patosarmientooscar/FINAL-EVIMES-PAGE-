/* ==========================================================================
   bento/index.js — arranque de "Qué hacemos" (4 cards 3D) y UN solo bucle
   para las cuatro (dentro de gsap.ticker, el bucle único de la web; si no
   hubiera GSAP, requestAnimationFrame).
   · Textos: js/data/servicios.js (BORRADOR) → las cards (el HTML lleva los
     mismos textos de respaldo).
   · Entrada: cada card recibe .in al entrar en pantalla (css/bento.css hace
     la subida de 40 px y el escalonado de 0,08 s).
   · Three.js y las escenas se importan al acercarse el bento (a menos de un
     viewport). Un solo renderer para las cuatro (shared.js) y cada card se
     crea en su turno (EV.gpu.turno), con los shaders compilados en paralelo.
     Cada card solo renderiza si está visible (makeCard).
   · Solo se mueve el destello (Animaciones 3D). Las otras tres se pintan UNA
     vez en su pose (POSE: segundos de su propia animación) y no se animan ni
     reaccionan; al cambiar de tamaño se vuelven a pintar una vez.
   · Versión fija (movimiento reducido, ahorro de datos, ?modo=fijo) o sin
     WebGL: póster estático de cada card, sacado del propio render
     (assets/bento/, ver ?bento=captura).
   ========================================================================== */
const EV = window.EV || {};
// Uno o varios contenedores [data-bento] (la home tiene uno; servicios.html, uno por oficio):
// todas sus cards comparten el mismo bucle.
const roots = Array.from(document.querySelectorAll('[data-bento]'));
if (roots.length) init();

function init() {
  const els = roots.flatMap(r => Array.from(r.querySelectorAll('.card')));
  textos(els);

  const io = new IntersectionObserver(es => es.forEach(e => {
    if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
  }), { threshold: .08 });
  els.forEach(el => io.observe(el));

  const captura = new URLSearchParams(location.search).get('bento') === 'captura';
  // Sin sonda de WebGL (crear un contexto de prueba costaba): si el renderer no se puede crear, pósters.
  if (!captura && EV.mode === 'still') { posters(els); return; }

  const cerca = new IntersectionObserver(es => {
    if (!es.some(e => e.isIntersecting)) return;
    cerca.disconnect();
    arrancar(els, captura).catch(err => { console.warn('[bento]', err); posters(els); });
  }, { rootMargin: '100% 0px' });   // a menos de un viewport
  roots.forEach(r => cerca.observe(r));
}

function textos(els) {
  const data = window.EVIMES_SERVICIOS || [];
  els.forEach(el => {
    const d = data.find(x => x.id === el.dataset.servicio);
    if (!d) return;
    const h = el.querySelector('h3'), p = el.querySelector('.meta p'), a = el.querySelector('.more'), n = el.querySelector('.num b'), hi = el.querySelector('.hint');
    if (h) h.textContent = d.nombre;
    if (p) p.textContent = d.frase;
    if (a) a.href = 'servicios.html#' + d.ancla;
    if (n && d.num) n.textContent = d.num;
    if (hi) { if (d.pista) hi.textContent = d.pista; else hi.remove(); }
  });
}

function posters(els) {
  roots.forEach(r => r.classList.add('is-fija'));
  els.forEach(el => {
    if (el.querySelector('.poster')) return;
    const k = el.dataset.kind;
    const pic = document.createElement('picture');
    pic.className = 'poster';
    pic.innerHTML = `<source media="(max-width: 900px)" srcset="assets/bento/${k}-movil.png"><img src="assets/bento/${k}-escritorio.png" alt="" loading="lazy" decoding="async">`;
    el.querySelector('canvas').after(pic);
  });
}

async function arrancar(els, captura) {
  const [S, { webCard }, { starCard }, { pinCard }, { iaCard }] = await Promise.all([
    import('./shared.js'), import('./web.js'), import('./star.js'), import('./pin.js'), import('./ia.js')
  ]);
  /* ---------- boot + one shared loop ---------- */
  const kinds = { web: webCard, star: starCard, pin: pinCard, ia: iaCard };
  const { cards, reduce } = S;
  // web: capas juntas y algo abiertas · pin: quieto sobre el mapa, anillos parados · ia: metal líquido en una forma suave
  const POSE = { web: 6.88, pin: 0.4, ia: 2.2 };
  const pintar = c => { c.render(); c.step(0); c.render(); };
  // Cada card en su turno (js/escenas.js): nunca dos cards en la misma tarea, y la onda del hero va antes.
  const crear = el => S.G.turno(async () => {
    if (el.__card) return; el.__card = true;
    const k = el.dataset.kind, c = await S.makeCard(el, kinds[k], { captura });
    if (k in POSE) { c.quieta = true; c.step(POSE[k]); pintar(c); c.trasResize = () => { c.step(0); pintar(c); }; return; }
    c.step(reduce || captura ? 1.5 : 0); if (reduce || captura) { c.render(); c.step(0); }
  }, 1);
  // Un solo bucle de WebGL en las cards: el del destello (las quietas no entran).
  const frame = dt => { for (const c of cards) { if (!c.visible || c.quieta) continue; if (!reduce) c.step(dt); c.render(); } };
  if (!captura) {
    if (window.gsap) gsap.ticker.add((time, dms) => frame(Math.min(.05, (dms || 16.7) / 1000)));
    else { let last = performance.now(); const f = now => { requestAnimationFrame(f); const dt = Math.min(.05, (now - last) / 1000); last = now; frame(dt); }; requestAnimationFrame(f); }
  }
  // Con todas las cards juntas (la home) se crean a la vez; repartidas por la página
  // (servicios.html, un contenedor por oficio) cada una se crea a una pantalla de
  // distancia: crear los 4 renderers de golpe costaba ~1,8 s de CPU en móvil.
  if (roots.length < 2 || captura) await Promise.all(els.map(crear));
  else {
    const cercaCard = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { cercaCard.unobserve(e.target); crear(e.target).catch(err => { console.warn('[bento]', err); posters([e.target]); }); } }), { rootMargin: '100% 0px' });
    els.forEach(el => cercaCard.observe(el));
  }
  // Pose fija: el primer step corre antes de que la cámara tenga sus matrices (el
  // centro de la ráfaga del destello salía fuera de la card). Un render y un
  // step(0) las ponen al día sin mover el tiempo.
  if (reduce || captura) cards.forEach(c => { c.render(); c.step(0); });

  // ?bento=captura: la pose fija (la de movimiento reducido) de cada card, para
  // los pósters de assets/bento/. Solo existe con ese parámetro.
  if (captura) {
    await S.ehListo;
    window.__bentoPosters = () => { const o = {}; cards.forEach(c => { c.render(); o[c.el.dataset.kind] = c.cv.toDataURL('image/png'); }); return o; };
  }
}
