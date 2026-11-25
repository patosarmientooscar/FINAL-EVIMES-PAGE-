/* ==========================================================================
   lab/ondas.js — laboratorio/ondas.html. Las dos piezas de la onda del logo
   con el código de la home (js/ondas.js, sin tocar su geometría, materiales
   ni muelles) en un ancla a pantalla completa, más lo del estudio de
   movimiento (Downloads/evimes-ondas-estudio): la lista de movimientos para
   elegir y el modo automático (6,5 s cada uno, en orden). Nunca en línea: sin
   "firma" (js/ondas.js ya no la tiene). Pasar de un movimiento a otro lo
   hacen los muelles de js/ondas.js: sin saltos.
   · Movimiento reducido: quietas en la hélice (lo hace js/ondas.js) y sin la lista.
   ========================================================================== */
import { reduce } from './comun.js';

// los nueve movimientos de js/ondas.js, con los nombres del estudio
const MOVS = [
  ['orbita', 'Órbita'], ['espejo', 'Espejo'], ['tijera', 'Tijera'], ['persecucion', 'Persecución'], ['intercambio', 'Intercambio'],
  ['apilar', 'Apilar'], ['helice', 'Hélice'], ['encaje', 'Encaje'], ['giroscopio', 'Giroscopio']
];
const HOLD = 6.5;

export async function iniciar({ escena }) {
  const ancla = escena.querySelector('[data-ondas]');
  const caja = document.querySelector('.lab-movs');
  const m = await import('../ondas.js');
  const api = await m.listo;
  if (!api) { if (caja) caja.hidden = true; return null; }          // sin WebGL: no se ve nada (como en la home)
  if (reduce || !caja) { if (caja) caja.hidden = true; return null; }

  const q = new URLSearchParams(location.search).get('mov');
  let cur = Math.max(0, MOVS.findIndex(x => x[0] === q)), auto = !q, desde = 0;

  const ul = document.createElement('ul');
  ul.className = 'lab-movs__l';
  const botones = MOVS.map(([clave, nombre], i) => {
    const li = document.createElement('li'), b = document.createElement('button');
    b.type = 'button'; b.textContent = nombre; b.dataset.mov = clave;
    b.addEventListener('click', () => { auto = false; ponAuto(); ir(i); });
    li.appendChild(b); ul.appendChild(li);
    return b;
  });
  const pie = document.createElement('div');
  pie.className = 'lab-auto';
  const ba = document.createElement('button');
  ba.type = 'button';
  ba.innerHTML = '<i aria-hidden="true"></i><span>Automático</span>';
  ba.addEventListener('click', () => { auto = !auto; desde = 0; ponAuto(); });
  pie.appendChild(ba);
  caja.append(ul, pie);
  caja.hidden = false;

  function ponAuto() { ba.setAttribute('aria-pressed', String(auto)); }
  function ir(i) {
    cur = i; desde = 0;
    api.setStepMotion(ancla, MOVS[i][0]);
    botones.forEach((b, j) => b.setAttribute('aria-pressed', String(j === i)));
    // en móvil la lista es una tira horizontal: el activo, a la vista
    const b = botones[i], r = b.getBoundingClientRect(), rc = caja.getBoundingClientRect();
    if (r.left < rc.left || r.right > rc.right) caja.scrollBy({ left: r.left - rc.left - 24, behavior: 'smooth' });
  }
  ponAuto();
  ir(cur);

  // el modo automático: en el bucle de la web
  const paso = (t, dms) => {
    if (!auto || document.hidden) return;
    desde += Math.min(.1, (dms || 16.7) / 1000);
    if (desde >= HOLD) ir((cur + 1) % MOVS.length);
  };
  if (window.gsap) gsap.ticker.add(paso);
  else { let l = 0; const f = now => { requestAnimationFrame(f); paso(0, l ? now - l : 16.7); l = now; }; requestAnimationFrame(f); }

  return { liberar() { if (window.gsap) gsap.ticker.remove(paso); auto = false; } };
}
