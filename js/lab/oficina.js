/* ==========================================================================
   lab/oficina.js — laboratorio/oficina.html. La oficina 360° tal como está
   (js/oficina/: la visita automática, la card de Disco y sus datos de
   PageSpeed). Se importa aquí para que solo se cargue en su página; la
   oficina se monta sola (su panorama y Three.js, a una pantalla de distancia).
   ========================================================================== */
export async function iniciar() {
  await import('../oficina/index.js');
  return null;
}
