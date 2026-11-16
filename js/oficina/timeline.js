/* ==========================================================================
   oficina/timeline.js — update(dt) con el progreso del scroll. Mismas fases y
   tiempos que el prototipo aprobado (evimes-oficina/index.html):
   ventana 0–0.16 · captions · acercamiento al monitor 0.28–0.44 · encendido
   0.34–0.66 · miniaturas 0.42–0.47 · vuelo de cards 0.47–0.705 escalonado ·
   salida 0.9–1. El progreso (tP) lo pone index.js leyendo Lenis; aquí se
   suaviza igual que en el prototipo.
   ========================================================================== */
import { SPOT } from './config.js';
import { THREE, dir } from './scene.js';

/* ---------------- scroll timeline ---------------- */
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x)), seg = (p, a, b) => clamp((p - a) / (b - a)),
      ease = t => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2, out = t => 1 - Math.pow(1 - t, 3), mix = (a, b, t) => a + (b - a) * t;

export function crearTimeline(E, C, dom, opts = {}) {
  const { renderer, camera, PU, SU, steamU } = E, { mR, mU, mN } = E.mon, { cards, qMon, ptr } = C;
  const { win, caps, scrim, hud } = dom;
  const reduce = !!opts.reduce;
  let P = 0, tP = 0, mx = 0, my = 0, tmx = 0, tmy = 0, W = 1, H = 1, mobile = false, t = 0, a = 0;
  let L = C.layout(false);

  function resize(w, h) { W = w; H = h; renderer.setSize(W, H, false); camera.aspect = W / H; camera.updateProjectionMatrix(); const m = W / H < .9; mobile = m; L = C.layout(mobile, W / H); }
  function puntero(e) { tmx = e.clientX / innerWidth * 2 - 1; tmy = -(e.clientY / innerHeight * 2 - 1); ptr.set(e.clientX / innerWidth * 2 - 1, -(e.clientY / innerHeight * 2 - 1)); }

  // camera stops: yaw/pitch of where we look, fov (vertical)
  const monYaw = (SPOT.monitor.tl[0] + SPOT.monitor.tr[0]) / 2, monPitch = (SPOT.monitor.tl[1] + SPOT.monitor.bl[1]) / 2;
  let hovered = null;
  const look = new THREE.Vector3();

  function update(dt) {
    t += dt; PU.uT.value = t; SU.uT.value = t; steamU.uT.value = t;
    P += (tP - P) * (1 - Math.pow(.0009, dt));
    mx += (tmx - mx) * (1 - Math.pow(.05, dt)); my += (tmy - my) * (1 - Math.pow(.05, dt));
    // A · the window opens (0 → .16)
    a = ease(seg(P, 0, .16));
    win.style.setProperty('--it', `${mix(14, 0, a)}vh`); win.style.setProperty('--ib', `${mix(14, 0, a)}vh`); win.style.setProperty('--ix', `${mix(mobile ? 4 : 12, 0, a)}vw`);
    win.style.setProperty('--r', `${mix(30, 0, a)}px`); win.style.setProperty('--edge', String(1 - a));
    // B/C · push in to the monitor (.30 → .44)  D · rise to frame the cards (.44 → .64)  F · exit (.9 → 1)
    const c = ease(seg(P, .28, .44)), d = ease(seg(P, .44, .64)), f = ease(seg(P, .9, 1));
    let yaw = mix(-6, 2, a), pitch = mix(2, -4, a), fov = mix(90, 76, a);
    yaw = mix(yaw, monYaw, c); pitch = mix(pitch, monPitch + .5, c); fov = mix(fov, 46, c);
    pitch = mix(pitch, mobile ? monPitch + 17 : monPitch + 11, d); fov = mix(fov, mobile ? 62 : 56, d);
    pitch = mix(pitch, pitch + 6, f);
    if (mobile) { fov = Math.min(100, fov * 1.3); }
    const lookAmt = reduce ? 0 : (1 - c * .5);
    yaw += mx * 7 * lookAmt; pitch += my * 3.5 * lookAmt;
    camera.fov = fov; camera.updateProjectionMatrix(); camera.lookAt(dir(yaw, pitch, look));
    // screen boots, office dims a touch so the cards pop
    SU.uBoot.value = Math.min(1, seg(P, .34, .46) * .7 + seg(P, .46, .66) * .3);
    PU.uDim.value = mix(mix(.55, 0, a), .22, d) + f * .75; PU.uSat.value = mix(1, .88, d);
    steamU.uA.value = a * (1 - c * .6) * (1 - f);
    // captions
    const c1 = seg(P, .17, .21) * (1 - seg(P, .27, .31)), c2 = seg(P, .66, .7) * (1 - seg(P, .86, .9));
    caps[0].style.opacity = c1; caps[0].style.transform = `translateY(${(1 - c1) * 24}px)`;
    caps[1].style.opacity = c2; caps[1].style.transform = `translateY(${(1 - c2) * 24}px)`;
    scrim.style.setProperty('--scrim', Math.max(c1, c2)); hud.style.opacity = seg(P, .16, .2) * (1 - seg(P, .26, .3));
    // cards: thumbnails appear on the screen, then each lifts off in turn and flies to its place above the monitor
    const thumbs = seg(P, .42, .47);
    camera.updateMatrixWorld();
    const hit = C.tocada(camera); const nh = (P > .6 && P < .9 && hit) ? hit : null;
    if (nh !== hovered) { hovered = nh; document.body.style.cursor = nh && nh.p.url ? 'pointer' : ''; }
    cards.forEach((c, i) => {
      const k = out(seg(P, .47 + i * .035, .6 + i * .035)); const kk = ease(k);
      const { start: s, end: e } = L[i];
      c.g.position.lerpVectors(s.pos, e.pos, kk);
      c.g.position.addScaledVector(mN, Math.sin(kk * Math.PI) * .9);                 // arc toward the camera on the way up
      c.g.position.addScaledVector(mU, Math.sin(t * .8 + i * 1.7) * .025 * kk + (mobile ? 0 : my * .05 * kk)); // gentle float
      c.g.position.addScaledVector(mR, mx * .06 * kk * (1 + i * .15));                     // parallax: cards > office
      c.thover = c === hovered ? 1 : 0; c.hover += (c.thover - c.hover) * (1 - Math.pow(.0005, dt));
      const sc = mix(s.s, e.s, kk) * (1 + c.hover * .07); c.g.scale.setScalar(sc);
      c.g.quaternion.copy(qMon); c.g.rotateY(mix(0, e.ry, kk) + mx * .06 * kk); c.g.rotateZ(mix(0, e.rz, kk) + Math.sin(t * .6 + i) * .006 * kk); c.g.rotateX(-.05 * kk + my * .03 * kk);
      c.g.position.addScaledVector(mN, c.hover * .18);
      const dim = hovered && hovered !== c ? .5 : 1; const vis = thumbs * (1 - f);
      c.face.material.opacity = vis; c.face.material.color.setScalar(mix(c.face.material.color.r, dim, .12));
      c.slab.material.opacity = vis * kk; c.edge.material.opacity = vis * kk; c.edge.visible = kk > .02; c.slab.visible = kk > .02;
      c.glow.material.uniforms.uA.value = (.25 + c.hover * .45) * kk * (1 - f);
      c.g.position.addScaledVector(mU, f * 1.2 * (1 + i * .2));
    });
  }

  return {
    update, resize, puntero,
    progreso(v) { tP = clamp(v); },
    // Salta a un progreso y lo asienta (solo ?oficina=captura: pósters de la versión fija).
    asentar(v) { tP = P = clamp(v); for (let i = 0; i < 90; i++) update(1 / 60); },
    get P() { return P; }, get abierta() { return a; }, get hovered() { return hovered; }, get mobile() { return mobile; }
  };
}
