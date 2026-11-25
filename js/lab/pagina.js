/* ==========================================================================
   lab/pagina.js — cada experimento (laboratorio/<nombre>.html), desde
   backup-pre-lab. El <body> dice cuál: data-lab="ondas|red|destello|oficina".
   · Solo se carga el de esa página: import() de js/lab/<nombre>.js, que monta
     el experimento con el código que ya usa la web (sin copiarlo).
   · Se libera al salir: al navegar (y en pagehide) se pierde a propósito cada
     contexto WebGL que se haya creado en la página (WEBGL_lose_context) y el
     experimento suelta lo suyo; si el navegador la devuelve desde su caché
     (atrás), se recarga.
   · La ficha: su nombre se escribe con las franjas tras abrirse la línea de
     entrada; después, sus tres líneas.
   · Los enlaces "← Índice" y "Siguiente" pasan por la transición de la web.
   ========================================================================== */
import { navegar, enlazar, escribir, alSalir } from './comun.js';

// cada contexto WebGL de la página, para soltarlo al salir (también el del lienzo fuera de pantalla del destello)
const contextos = new Set();
const original = HTMLCanvasElement.prototype.getContext;
HTMLCanvasElement.prototype.getContext = function (tipo, ...resto) {
  const ctx = original.call(this, tipo, ...resto);
  if (ctx && /webgl/i.test(tipo)) contextos.add(ctx);
  return ctx;
};

let suelta = null, liberada = false;
function liberar() {
  if (liberada) return;
  liberada = true;
  try { if (suelta) suelta(); } catch (e) { console.warn('[lab]', e); }
  contextos.forEach(gl => { try { const x = gl.getExtension('WEBGL_lose_context'); if (x && !gl.isContextLost()) x.loseContext(); } catch (e) { /* ya perdido */ } });
  contextos.clear();
}
alSalir(liberar);
addEventListener('pagehide', liberar);
addEventListener('pageshow', e => { if (e.persisted && liberada) location.reload(); });

// enlaces del laboratorio con la transición
document.querySelectorAll('.lab-volver, .lab-sig').forEach(enlazar);

// la ficha
const ficha = document.querySelector('.lab-ficha');
const entra = document.documentElement.classList.contains('lab-entra');
escribir(ficha && ficha.querySelector('.lab-ficha__t'), { W: 4, dura: .8, retraso: entra ? .75 : .2 })
  .then(() => ficha && ficha.classList.add('is-visible'));

// el experimento de esta página
const nombre = document.body.dataset.lab;
const escena = document.querySelector('.lab-escena') || document.body;
if (nombre) {
  import(`./${nombre}.js`)
    .then(m => m.iniciar({ escena }))
    .then(api => { if (api && api.liberar) suelta = api.liberar; })
    .catch(e => console.warn('[lab] el experimento no carga', e));
}

export { navegar };
