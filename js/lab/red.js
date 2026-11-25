/* ==========================================================================
   lab/red.js — laboratorio/red.html. La red de la home (js/red.js, la misma
   física y el mismo dibujo) a pantalla completa: su canvas ya es fijo y a
   pantalla completa; se crea con el primer gesto (como en la home). Con
   movimiento reducido o sin WebGL queda la cuadrícula CSS, quieta.
   ========================================================================== */
export async function iniciar() {
  await import('../red.js');
  return null;
}
