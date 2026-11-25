/* ==========================================================================
   lab/indice.js — laboratorio.html, el índice (desde backup-pre-lab).
   · "LABORATORIO" se escribe con las franjas de la home; después, el lema.
   · Cada línea se escribe al entrar en pantalla (nombre, línea fina, técnica).
   · Escritorio (con cursor): al pasar por una línea, su nombre a blanco y las
     otras al 30 %; la vista previa (vídeo 320 × 200) sigue al cursor con
     suavizado y se va con un fundido al salir de la lista.
   · Táctil: el primer toque abre la vista previa debajo de la línea; el
     segundo (en la línea o en el vídeo) abre el experimento.
   · Los vídeos no descargan nada hasta el hover o el toque (preload none y
     las fuentes en data-src). Con movimiento reducido, solo su póster.
   · La red (js/red.js, con su Three.js) se importa con el primer gesto: la
     carga del índice no lleva Three.js.
   ========================================================================== */
import { EV, reduce, cine, navegar, enlazar, escribir } from './comun.js';

const lista = document.querySelector('.lab-lista');
const filas = [...document.querySelectorAll('.lab-fila')];
const vista = document.querySelector('.lab-vista');
const vids = [...vista.querySelectorAll('.lab-vista__v')];
const conCursor = matchMedia('(hover: hover) and (pointer: fine)').matches;

/* ---------- la portada ---------- */
const lema = document.querySelector('.lab-lema');
escribir(document.querySelector('.lab-h1'), { W: 7, dura: 1.5, retraso: document.documentElement.classList.contains('lab-entra') ? .55 : .15 })
  .then(() => lema && lema.classList.add('is-visible'));

/* ---------- la red: con el primer gesto ---------- */
if (cine && !reduce) {
  let pedida = false;
  const pedir = () => {
    if (pedida) return; pedida = true;
    removeEventListener('pointermove', pedir); removeEventListener('pointerdown', pedir);
    import('../red.js').catch(e => console.warn('[lab] la red no carga', e));
  };
  addEventListener('pointermove', pedir, { passive: true });
  addEventListener('pointerdown', pedir, { passive: true });
}

/* ---------- las líneas se escriben al entrar ---------- */
if (cine) {
  const io = new IntersectionObserver(es => es.forEach(e => {
    if (!e.isIntersecting) return;
    io.unobserve(e.target);
    const f = e.target;
    escribir(f.querySelector('.lab-nombre'), { W: 4, dura: .75 });
    setTimeout(() => f.classList.add('is-escrita'), 280);
  }), { threshold: .45 });
  filas.forEach(f => io.observe(f));
} else filas.forEach(f => f.classList.add('is-escrita'));

/* ---------- la vista previa ---------- */
function videoDe(nombre) { return vids.find(v => v.dataset.vista === nombre); }
function encender(nombre) {
  vids.forEach(v => {
    const activa = v.dataset.vista === nombre, video = v.querySelector('video');
    v.classList.toggle('is-activa', activa);
    if (!video) return;
    if (activa) {
      if (!video.poster && video.dataset.poster) video.poster = video.dataset.poster;
      if (reduce) return;                              // quieto: solo el póster
      if (!video.dataset.cargado) {
        video.querySelectorAll('source[data-src]').forEach(s => { s.src = s.dataset.src; });
        video.dataset.cargado = '1';
        video.load();
      }
      const p = video.play();
      if (p && p.catch) p.catch(() => { /* sin vídeo (no se pudo grabar o no carga): se queda el póster */ });
    } else if (!video.paused) video.pause();
  });
}
function apagarVideos() { vids.forEach(v => { const video = v.querySelector('video'); if (video && !video.paused) video.pause(); }); }

let activa = null;
function marcar(f) {
  activa = f;
  lista.classList.toggle('is-foco', !!f);
  filas.forEach(x => x.classList.toggle('is-activa', x === f));
}

if (conCursor) {
  /* ----- escritorio: sigue al cursor ----- */
  vista.hidden = false;
  const W = 320, H = 200, M = 28;
  const pos = { x: 0, y: 0, tx: 0, ty: 0, viva: false };
  let fuera = null;
  const destino = (cx, cy) => {
    let x = cx + M;
    if (x + W > innerWidth - 16) x = cx - M - W;       // sin sitio a la derecha: a la izquierda del cursor
    pos.tx = x;
    pos.ty = Math.min(innerHeight - H - 16, Math.max(16, cy - H / 2));
  };
  const colocar = () => { vista.style.transform = `translate3d(${pos.x.toFixed(1)}px, ${pos.y.toFixed(1)}px, 0)`; };
  lista.addEventListener('pointermove', e => {
    destino(e.clientX, e.clientY);
    if (!pos.viva) { pos.x = pos.tx; pos.y = pos.ty; colocar(); }
  }, { passive: true });
  filas.forEach(f => f.addEventListener('pointerenter', e => {
    clearTimeout(fuera);
    destino(e.clientX, e.clientY);
    if (!pos.viva) { pos.x = pos.tx; pos.y = pos.ty; colocar(); pos.viva = true; }
    marcar(f);
    encender(f.dataset.vista);
    vista.classList.add('is-visible');
  }));
  lista.addEventListener('pointerleave', () => {
    marcar(null);
    vista.classList.remove('is-visible');
    pos.viva = false;
    clearTimeout(fuera);
    fuera = setTimeout(apagarVideos, 400);              // tras el fundido
  });
  // el seguimiento suavizado: en el bucle de la web (gsap.ticker); sin GSAP, requestAnimationFrame
  const seguir = (t, dms) => {
    if (!pos.viva) return;
    const k = reduce ? 1 : 1 - Math.exp(-Math.min(.05, (dms || 16.7) / 1000) * 11);
    const dx = pos.tx - pos.x, dy = pos.ty - pos.y;
    if (Math.abs(dx) < .1 && Math.abs(dy) < .1) return;
    pos.x += dx * k; pos.y += dy * k;
    colocar();
  };
  if (window.gsap) gsap.ticker.add(seguir);
  else { let l = 0; const f = now => { requestAnimationFrame(f); seguir(0, l ? now - l : 16.7); l = now; }; requestAnimationFrame(f); }
  // el teclado: el foco marca la línea (sin vídeo: no hay cursor al que seguir)
  filas.forEach(f => {
    f.addEventListener('focus', () => marcar(f));
    f.addEventListener('blur', () => { if (activa === f) marcar(null); });
  });
  filas.forEach(enlazar);
} else {
  /* ----- táctil: primer toque, la vista previa debajo; segundo toque, el experimento ----- */
  filas.forEach(f => f.addEventListener('click', e => {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    e.preventDefault();
    if (activa === f) { navegar(f.href); return; }
    marcar(f);
    vista.classList.remove('is-visible');
    f.parentElement.appendChild(vista);
    vista.hidden = false;
    encender(f.dataset.vista);
    requestAnimationFrame(() => requestAnimationFrame(() => {
      vista.classList.add('is-visible');
      const r = vista.getBoundingClientRect();
      if (r.bottom > innerHeight - 12) scrollBy({ top: r.bottom - innerHeight + 24, behavior: reduce ? 'auto' : 'smooth' });
    }));
  }));
  vista.addEventListener('click', () => { if (activa) navegar(activa.href); });
  vista.style.pointerEvents = 'auto';
}

EV.lab = { navegar };
