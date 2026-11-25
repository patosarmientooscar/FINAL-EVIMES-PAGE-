/* ==========================================================================
   lab/destello.js — laboratorio/destello.html. El destello de la card de
   Animaciones 3D (js/bento/star.js + js/bento/shared.js, tal cual: la estrella
   de cromo con el EH grabado y su ráfaga azul y cian) a pantalla completa.
   · Interactivo como en la card: arrastrar la hace girar, el cursor la inclina.
   · "lado" (el modo de la card sin texto encima): la estrella, centrada.
   · Movimiento reducido: su pose fija (la de los pósters del bento), quieta.
   ========================================================================== */
export async function iniciar({ escena }) {
  const el = escena.querySelector('.lab-destello');
  const [S, { starCard }] = await Promise.all([import('../bento/shared.js'), import('../bento/star.js')]);
  const c = await S.makeCard(el, starCard);
  c.lado = true;
  if (c.onResize) c.onResize();
  c.visible = true;

  let paso = null;
  if (S.reduce) {
    c.step(1.5); c.render(); c.step(0); c.render();
    c.trasResize = () => { c.step(0); c.render(); };
  } else {
    c.step(0); c.render();
    paso = (t, dms) => { if (document.hidden) return; c.step(Math.min(.05, (dms || 16.7) / 1000)); c.render(); };
    if (window.gsap) gsap.ticker.add(paso);
    else { let l = 0; const f = now => { if (!paso) return; requestAnimationFrame(f); paso(0, l ? now - l : 16.7); l = now; }; requestAnimationFrame(f); }
  }
  el.classList.add('is-viva');
  // ?captura (tools/grabar-lab.mjs): un paso fijo, sin depender del reloj (la vista previa del índice)
  if (new URLSearchParams(location.search).has('captura')) window.__labPaso = dt => { c.step(dt); c.render(); };

  return {
    liberar() {
      if (paso && window.gsap) gsap.ticker.remove(paso);
      paso = null;
      const { renderer } = S.compartido();
      c.scene.traverse(o => { if (o.geometry) o.geometry.dispose(); [].concat(o.material || []).forEach(m => m && m.dispose()); });
      renderer.dispose();
    }
  };
}
