/* ==========================================================================
   que-hacemos.js — "Qué hacemos" en la home (desde backup-pre-que-hacemos):
   un panel fijo (sticky, css/que-hacemos.css) y 4 servicios que cambian con
   el scroll. Sustituye al bento de 4 cards; reutiliza sus escenas (js/bento/).
   · Índice activo = progreso del scroll dentro de la sección (posiciones
     cacheadas; se leen de nuevo solo al cambiar el tamaño): 0–25 %, 25–50 %,
     50–75 %, 75–100 %, con una histéresis del 5 % del tramo (no tiembla en
     los límites). Dentro de gsap.ticker, el bucle único de la web.
   · Cambio (0,7 s): la imagen saliente se funde y baja 12 px; la entrante
     sube 12 px con un clip-path de abajo arriba; el texto entra línea a
     línea (60 ms). Solo transform, opacity y clip-path.
   · Clic (o Enter) en un título: Lenis.scrollTo (1,1 s) al inicio de su tramo.
     Flechas arriba/abajo (izquierda/derecha en móvil): foco entre títulos.
   · Escenas: el renderer compartido del bento (un solo contexto WebGL).
     Desarrollo web se pinta una vez en su pose; los bodegones (Software con
     IA, Posicionamiento) una vez y se reutilizan como imagen; el destello
     (Animaciones 3D) es lo único que anima, y solo si está activo y la
     sección en pantalla. Three.js se importa a menos de un viewport.
   · Sin JS, con movimiento reducido o en versión fija (EV.mode 'still'): los
     4 en lista con su póster (assets/img/que-hacemos-*, ?qh=captura).
   ========================================================================== */
const EV = window.EV || {};
const raiz = document.querySelector('[data-qh]');
if (raiz) iniciar();

function iniciar() {
  const tabs = Array.from(raiz.querySelectorAll('[role="tab"]'));
  const paneles = tabs.map(t => document.getElementById(t.getAttribute('aria-controls')));
  const captura = new URLSearchParams(location.search).get('qh') === 'captura';
  const N = paneles.length;

  // Versión fija / movimiento reducido: lista con pósters, sin pestañas ni Three.js.
  if (EV.mode !== 'cine' && !captura) {
    paneles.forEach(p => { p.removeAttribute('role'); p.removeAttribute('aria-labelledby'); });
    return;
  }

  const pista = raiz.querySelector('.qh__pista');
  const fijo = raiz.querySelector('.qh__fijo');
  const fila = raiz.querySelector('.qh__tabs');
  const estrecha = matchMedia('(max-width: 860px)');
  const gs = window.gsap;
  const media = paneles.map(p => p.querySelector('.qh__media'));
  const textos = paneles.map(p => p.querySelector('.qh__texto'));
  const lineas = paneles.map(p => Array.from(p.querySelectorAll('.qh__l > span')));
  const barras = tabs.map(t => t.querySelector('.qh__barra i'));

  let activo = 0, bloqueo = 0, ultimaY = -1, enVista = false;
  const lay = { inicio: 0, recorrido: 1 };

  // inicio: el estado de reposo de los 4 (solo el primero a la vista)
  paneles.forEach((p, i) => { if (i) p.inert = true; });

  /* ---------- medidas (solo al cambiar el tamaño) ---------- */
  function medir() {
    let y = 0, n = pista; while (n) { y += n.offsetTop; n = n.offsetParent; }
    const top = parseFloat(getComputedStyle(fijo).top) || 0;
    lay.inicio = y - top;                                       // donde el panel se queda fijo
    lay.recorrido = Math.max(1, pista.offsetHeight - fijo.offsetHeight);
    ultimaY = -1;
  }
  medir();
  addEventListener('resize', medir);
  if (window.ResizeObserver) new ResizeObserver(medir).observe(document.body);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(medir);
  estrecha.addEventListener('change', () => { barras.forEach(b => { b.style.transform = ''; }); ultimaY = -1; });

  const lenis = () => (EV.home && EV.home.lenis) || null;
  const scrollY = () => { const l = lenis(); return l ? l.scroll : window.scrollY; };

  /* ---------- estado por scroll ---------- */
  function tick() {
    const y = scrollY();
    if (y === ultimaY) return;
    ultimaY = y;
    const p = Math.min(1, Math.max(0, (y - lay.inicio) / lay.recorrido));
    const f = Math.min(N - 1e-4, p * N);
    if (!bloqueo) {
      const H = 0.05;                                           // histéresis: 5 % del tramo
      if (f < activo - H || f >= activo + 1 + H) cambiar(Math.min(N - 1, Math.max(0, Math.floor(f))));
    }
    const local = Math.min(1, Math.max(0, f - activo));
    const b = barras[activo], s = (estrecha.matches ? 'scaleX(' : 'scaleY(') + local.toFixed(4) + ')';
    if (b.style.transform !== s) b.style.transform = s;
  }

  /* ---------- el cambio entre servicios ---------- */
  const EASE = 'power4.out';                                    // la curva suave de la web (cubic-bezier(.16, 1, .3, 1), casi igual)
  function cambiar(i, desdeClic) {
    if (i === activo) return;
    const prev = activo;
    activo = i;
    tabs.forEach((t, k) => { t.setAttribute('aria-selected', String(k === i)); t.tabIndex = k === i ? 0 : -1; });
    barras[prev].style.transform = '';
    paneles.forEach((p, k) => { p.classList.toggle('is-activo', k === i); p.inert = k !== i; });
    if (estrecha.matches && !desdeClic) {                       // en móvil, el título activo siempre a la vista
      const t = tabs[i], x = t.offsetLeft - (fila.clientWidth - t.offsetWidth) / 2;
      fila.scrollTo({ left: Math.max(0, x), behavior: 'smooth' });
    }
    escenas.activo(i);
    if (!gs) return;
    const todo = k => [paneles[k], media[k], textos[k], ...lineas[k]];
    paneles.forEach((p, k) => { if (k !== i && k !== prev) { gs.killTweensOf(todo(k)); gs.set(p, { opacity: 0, zIndex: 0 }); } });
    // sale: el texto se va enseguida (nunca dos textos a la vez); la imagen se funde y baja 12 px
    const po = paneles[prev];
    gs.killTweensOf(todo(prev));
    gs.set(po, { zIndex: 0 });
    gs.to(textos[prev], { opacity: 0, duration: 0.18, ease: 'power1.out' });
    gs.to(po, { opacity: 0, duration: 0.45, ease: 'power2.out' });
    gs.to(media[prev], { y: 12, duration: 0.7, ease: EASE });
    // entra: sube desde 12 px con clip-path de abajo arriba; el texto, línea a línea (60 ms)
    const pi = paneles[i];
    gs.killTweensOf(todo(i));
    gs.set(pi, { opacity: 1, zIndex: 2 });
    gs.set(textos[i], { opacity: 1 });
    gs.fromTo(media[i], { y: 12, clipPath: 'inset(100% 0% 0% 0% round 14px)' },
      { y: 0, clipPath: 'inset(0% 0% 0% 0% round 14px)', duration: 0.7, ease: EASE, clearProps: 'clipPath' });
    gs.fromTo(lineas[i], { yPercent: 105 }, { yPercent: 0, duration: 0.6, ease: EASE, stagger: 0.06, delay: 0.16 });
  }

  /* ---------- clic y teclado ---------- */
  function ir(i) {
    const destino = Math.round(lay.inicio + (i / N) * lay.recorrido) + (i ? 1 : 0);
    clearTimeout(bloqueo);
    cambiar(i, true);
    bloqueo = setTimeout(() => { bloqueo = 0; ultimaY = -1; }, 1400);
    const fin = () => { clearTimeout(bloqueo); bloqueo = 0; ultimaY = -1; };
    const l = lenis();
    if (l) l.scrollTo(destino, { duration: 1.1, easing: t => 1 - Math.pow(1 - t, 4), onComplete: fin });
    else window.scrollTo({ top: destino, behavior: 'smooth' });
  }
  tabs.forEach((t, i) => t.addEventListener('click', () => ir(i)));
  fila.addEventListener('keydown', e => {
    const k = tabs.indexOf(document.activeElement);
    if (k < 0) return;
    const sig = { ArrowDown: 1, ArrowRight: 1, ArrowUp: -1, ArrowLeft: -1 }[e.key];
    let n = -1;
    if (sig) n = (k + sig + N) % N; else if (e.key === 'Home') n = 0; else if (e.key === 'End') n = N - 1;
    if (n < 0) return;
    e.preventDefault();
    tabs[n].focus();
  });
  // un gesto del usuario suelta el bloqueo del salto (si lo interrumpe, manda el scroll)
  ['wheel', 'touchstart'].forEach(ev => addEventListener(ev, () => { if (bloqueo) { clearTimeout(bloqueo); bloqueo = 0; ultimaY = -1; } }, { passive: true }));

  new IntersectionObserver(es => { enVista = es[0].isIntersecting; }, { rootMargin: '0px' }).observe(raiz);

  /* ---------- escenas (las del bento) ---------- */
  const escenas = montarEscenas();
  if (gs) gs.ticker.add((time, dms) => { tick(); escenas.frame(Math.min(0.05, (dms || 16.7) / 1000)); });
  else { const f = now => { requestAnimationFrame(f); tick(); escenas.frame(1 / 60); }; requestAnimationFrame(f); }

  function montarEscenas() {
    let destello = null, vivoActivo = activo;
    const api = {
      activo(i) { vivoActivo = i; },
      // Solo el destello se mueve: si está activo, la sección en pantalla y la pestaña visible.
      frame(dt) { if (destello && vivoActivo === 1 && enVista && !document.hidden) { destello.step(dt); destello.render(); } }
    };
    const lista = c => c.classList.add('is-lista');
    const arrancar = async () => {
      const [S, { webCard }, { starCard }, B] = await Promise.all([
        import('./bento/shared.js'), import('./bento/web.js'), import('./bento/star.js'), import('./bento/bodegones.js')
      ]);
      const el = k => media[paneles.findIndex(p => p.dataset.k === k)];
      const turno = fn => S.G.turno(fn, 1);                     // una escena por turno (js/escenas.js); la onda va antes
      if (captura) media.forEach(m => { m.style.width = '1600px'; m.style.height = '1000px'; m.style.aspectRatio = 'auto'; });
      const pintar = c => { c.render(); c.step(0); c.render(); };
      const tareas = [
        // Desarrollo web: una vez en su pose (la del bento) y al cambiar de tamaño
        turno(async () => {
          const c = await S.makeCard(el('web'), webCard, { captura });
          c.quieta = true; c.step(6.88); pintar(c); lista(c.cv);
          c.trasResize = () => { c.step(0); pintar(c); };
        }),
        // Animaciones 3D: el destello (el único que anima)
        turno(async () => {
          const c = await S.makeCard(el('star'), starCard, { captura });
          c.quieta = true;                                       // fuera del bucle del bento: lo mueve frame()
          c.step(captura ? 1.5 : 0); c.render(); c.step(0); c.render(); lista(c.cv);
          c.trasResize = () => { c.step(0); c.render(); };
          destello = c;
        }),
        // Software con IA y Posicionamiento: bodegones quietos, una vez
        turno(() => B.bodegon(el('ia'), 'ia', { captura })),
        turno(() => B.bodegon(el('seo'), 'seo', { captura }))
      ];
      await Promise.all(tareas);
      // ?qh=captura: los pósters (assets/img/que-hacemos-<web|3d|ia|seo>, 1600 × 1000) del propio render
      if (captura) {
        await S.ehListo;
        window.__qhPosters = () => {
          const o = {};
          S.cards.forEach(c => { c.render(); o[c.el.closest('.qh__panel').dataset.k] = c.cv.toDataURL('image/png'); });
          B.bodegones.forEach(b => { o[b.k] = b.capturar(1600, 1000); });
          return o;
        };
      }
    };
    const cerca = new IntersectionObserver(es => {
      if (!es.some(e => e.isIntersecting)) return;
      cerca.disconnect();
      arrancar().catch(err => console.warn('[que-hacemos] sin escenas en vivo, pósters', err));
    }, { rootMargin: '100% 0px' });
    cerca.observe(raiz);
    return api;
  }
}
