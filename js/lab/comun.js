/* ==========================================================================
   lab/comun.js — lo común del laboratorio (desde backup-pre-lab):
   · navegar(): la transición de la web antes de cambiar de página: una línea
     fina cruza la pantalla y se abre en negro (.5 s, css/lab.css → .lab-sale).
     La página de destino empieza negra con la línea y se abre desde ella
     (.lab-entra, la pone su <head>).
   · escribir(): un titular con las franjas de las letras de la home
     (EV.recorrido.Bloque, js/recorrido.js), al ritmo del tiempo, no del scroll.
   · Movimiento reducido o versión fija: sin transición ni letras.
   ========================================================================== */
export const EV = window.EV || (window.EV = {});
export const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
export const cine = EV.mode === 'cine';
const raiz = document.documentElement;

let antesDeSalir = null;
export function alSalir(fn) { antesDeSalir = fn; }

export function navegar(href) {
  if (raiz.classList.contains('lab-sale')) return;
  if (reduce) { if (antesDeSalir) antesDeSalir(); location.href = href; return; }
  raiz.classList.remove('lab-entra');
  raiz.classList.add('lab-sale');
  try { sessionStorage.setItem('lab-velo', '1'); } catch (e) { /* sin sessionStorage: la siguiente entra sin la línea */ }
  setTimeout(() => { if (antesDeSalir) antesDeSalir(); location.href = href; }, 520);
}

// los enlaces internos del laboratorio pasan por la transición (no los que abren pestaña o llevan modificadores)
export function enlazar(a) {
  a.addEventListener('click', e => {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || a.target === '_blank') return;
    e.preventDefault();
    navegar(a.href);
  });
}

// al volver con el botón "atrás" (bfcache), la página no se queda tapada por la línea
addEventListener('pageshow', e => { if (e.persisted) raiz.classList.remove('lab-sale'); });

const fuentes = document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve();

// escribe un titular con las franjas (W letras a la vez, en "dura" segundos, tras "retraso" segundos)
export function escribir(el, { W = 6, dura = 1.2, retraso = 0 } = {}) {
  const R = EV.recorrido;
  if (!el) return Promise.resolve(null);
  if (!R || !cine) { el.classList.add('is-lista'); return Promise.resolve(null); }
  return fuentes.then(() => new Promise(fin => {
    const b = new R.Bloque({ el, W });
    b.partir();
    b.ordenar();
    b.escribir(0);
    el.classList.add('is-lista');
    let t0 = null;
    const paso = ahora => {
      if (t0 === null) t0 = ahora + retraso * 1000;
      const p = Math.min(1, Math.max(0, (ahora - t0) / (dura * 1000)));
      b.escribir(p);
      if (p < 1) requestAnimationFrame(paso); else fin(b);
    };
    requestAnimationFrame(paso);
    addEventListener('resize', () => { if (b.P < 1) b.ordenar(); });
  }));
}
