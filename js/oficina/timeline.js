/* ==========================================================================
   oficina/timeline.js — update(dt) con el progreso del scroll (0 → 1).
   ventana se abre 0–0.12 · EVIMES se enciende 0.085–0.13 (dos parpadeos) ·
   "Aquí se hacen." 0.13–0.23 · acercamiento al monitor 0.22–0.38 ·
   encendido 0.29–0.40 · caída dentro de la pantalla 0.40–0.53 (túnel de
   luz) · flash 0.532 · la web sale con nosotros 0.535–0.66 · texto de Disco
   0.64 en adelante · recorrido de la web dentro de la card 0.68–0.86 ·
   cierre en card 0.88–1 (la ventana vuelve a ser una card del gris y se
   queda así; no se funde a navy).
   El progreso (tP) lo pone index.js leyendo Lenis; aquí se suaviza con el
   mismo muelle que el prototipo de la oficina (1 - 0.0009^dt).
   ========================================================================== */
import { SPOT } from './config.js';
import { THREE, dir, D2R } from './scene.js';

const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x)), seg = (p, a, b) => clamp((p - a) / (b - a)),
      ease = t => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2, mix = (a, b, t) => a + (b - a) * t,
      lmix = (a, b, t) => Math.exp(mix(Math.log(a), Math.log(b), t));            // fov: zoom at a constant rate

// EVIMES: se enciende con dos parpadeos (u: 0 → 1 a lo largo de 0.085–0.13)
function letrero(u) {
  if (u <= 0) return 0;
  if (u < .1) return .85 * u / .1;     // first catch
  if (u < .2) return .06;              // drops
  if (u < .28) return .7;              // second
  if (u < .36) return .12;             // drops again
  return mix(.45, 1, ease(seg(u, .36, 1)));
}

export function crearTimeline(E, K, dom, opts = {}) {
  const { renderer, camera, PU, SU, signU, steamU } = E, { mR, mU, mN, mC, mW, mH } = E.mon;
  const { win, caps, scrim, hud, flash } = dom;
  const reduce = !!opts.reduce;
  let P = 0, tP = 0, mx = 0, my = 0, tmx = 0, tmy = 0, W = 1, H = 1, mobile = false, t = 0, a = 0;
  let rx = 0, ry = 0, hov = 0, hovered = false;

  const m = SPOT.monitor;
  const monYaw = (m.tl[0] + m.tr[0]) / 2, monPitch = (m.tl[1] + m.bl[1]) / 2;
  const sH = (m.tr[0] - m.tl[0]) * .93, sV = (m.tl[1] - m.bl[1]) * .93;        // the lit screen (inset .035 per side), in degrees
  const tmpM = new THREE.Matrix4(), qMon = new THREE.Quaternion().setFromRotationMatrix(tmpM.makeBasis(mR, mU, mN));
  const look = new THREE.Vector3();

  // fin de la cámara (la card encima del monitor) y dónde acaba la card
  let END, start, end;
  function layout() {
    const fovEnd = mobile ? Math.min(100, 62 * 1.3) : 56;
    END = { fov: fovEnd, pitch: mobile ? monPitch + 17 : monPitch + 12, yaw: mobile ? monYaw : monYaw - 9 };
    const ez = mobile ? 1.2 : 1.3, dist = mC.length() - ez;
    const th = Math.atan(Math.tan(fovEnd / 2 * D2R) * (W / H));                     // horizontal half-angle
    const wMax = 2 * dist * Math.tan(th) * .86;                                      // mobile: the whole card fits across
    const w1 = Math.min(mW * (mobile ? .9 : .56), wMax), s1 = w1 / K.cw;
    start = { pos: mC.clone().addScaledVector(mN, .02), s: mW * .93 / K.cw };
    end = { pos: mC.clone().addScaledVector(mU, mH * .5 + K.ch * s1 * .5 + mH * (mobile ? .1 : .02)).addScaledVector(mN, ez), s: s1 };
  }
  function resize(w, h) { W = w; H = h; renderer.setSize(W, H, false); camera.aspect = W / H; camera.updateProjectionMatrix(); mobile = W / H < .9; layout(); }
  function puntero(e) { tmx = e.clientX / innerWidth * 2 - 1; tmy = -(e.clientY / innerHeight * 2 - 1);
    const r = win.getBoundingClientRect(); K.ptr.set((e.clientX - r.left) / r.width * 2 - 1, -((e.clientY - r.top) / r.height * 2 - 1)); }
  // vertical fov at which the lit screen fills the whole frame
  const fillFov = () => Math.min(sV, 2 * Math.atan(Math.tan(sH / 2 * D2R) / (W / H)) / D2R);

  function update(dt) {
    t += dt; PU.uT.value = t; SU.uT.value = t; steamU.uT.value = t; K.BU.uT.value = t;
    P += (tP - P) * (1 - Math.pow(.0009, dt));
    mx += (tmx - mx) * (1 - Math.pow(.05, dt)); my += (tmy - my) * (1 - Math.pow(.05, dt));

    // the window: opens from a card (0 → .12) and closes back into one (.88 → 1)
    const ao = ease(seg(P, 0, .12)), ac = ease(seg(P, .88, 1)); a = ao * (1 - ac);
    win.style.setProperty('--it', `${mix(14, 0, a)}vh`); win.style.setProperty('--ib', `${mix(14, 0, a)}vh`); win.style.setProperty('--ix', `${mix(mobile ? 4 : 12, 0, a)}vw`);
    win.style.setProperty('--r', `${mix(30, 0, a)}px`); win.style.setProperty('--edge', String(1 - a));

    // camera: wide → the monitor → into the screen → (flash) → back out with the web
    const c = ease(seg(P, .22, .38)), fr = seg(P, .40, .53), o = ease(seg(P, .535, .66)), after = P >= .532;
    let yaw = mix(-6, 2, ao), pitch = mix(2, -4, ao), fov = mix(90, 76, ao);
    yaw = mix(yaw, monYaw, c); pitch = mix(pitch, monPitch + .5, c); fov = mix(fov, 46, c);
    if (mobile) fov = Math.min(100, fov * 1.3);
    const fovIn = fillFov() * .3;
    if (!after) { const k = Math.pow(fr, 1.7); fov = lmix(fov, fovIn, k); pitch = mix(pitch, monPitch, ease(fr)); }
    else { fov = lmix(fovIn, END.fov, o); yaw = mix(monYaw, END.yaw, o); pitch = mix(monPitch, END.pitch, o); }
    fov *= 1 + ac * .06;                                                             // a small step back as it closes
    const inside = seg(P, .36, .42) * (1 - seg(P, .6, .68));
    const lookAmt = reduce ? 0 : (1 - c * .5) * (1 - inside);
    yaw += mx * 7 * lookAmt; pitch += my * 3.5 * lookAmt;
    camera.fov = fov; camera.updateProjectionMatrix(); camera.lookAt(dir(yaw, pitch, look));

    // the screen, the room, the sign, the steam
    const boot = seg(P, .29, .40);
    SU.uBoot.value = boot; SU.uTun.value = after ? 0 : fr; SU.uAfter.value = after ? 1 - (1 - o) * .4 : 0;
    // once the web is out the EH steps back (on mobile it would sit right behind the title)
    SU.uLogoA.value = after ? 1 - o * (mobile ? 1 : .6) : 1;
    PU.uDim.value = mix(mix(.55, 0, ao), .38, ease(seg(P, .3, .4))) - (after ? .1 * o : 0);
    PU.uSat.value = mix(1, .88, seg(P, .3, .4));
    PU.uSpill.value = after ? mix(1.5, .8, o) : Math.pow(boot, 1.5) * (1 + fr * .7);
    signU.uOn.value = letrero(seg(P, .085, .13));
    steamU.uA.value = ao * (1 - c * .6) * (1 - seg(P, .38, .45)) + (after ? o * .7 : 0);
    flash.style.opacity = after ? 1 - ease(seg(P, .532, .575)) : Math.pow(seg(P, .505, .532), 3);

    // captions
    const c1 = seg(P, .13, .15) * (1 - seg(P, .21, .23)), c2 = seg(P, .64, .68);
    caps[0].style.opacity = c1; caps[0].style.transform = `translateY(${(1 - c1) * 24}px)`;
    caps[1].style.opacity = c2; caps[1].style.transform = `translateY(${(1 - c2) * 24}px)`;
    caps[1].classList.toggle('is-on', c2 > .5);
    scrim.style.setProperty('--scrim', Math.max(c1, c2)); hud.style.opacity = seg(P, .12, .14) * (1 - seg(P, .2, .23));

    // the card: born inside the screen at the flash, comes out with us, settles above the monitor
    const g = K.g; g.visible = after;
    if (after) {
      camera.updateMatrixWorld();
      const hit = P > .62 ? K.tocada(camera) : null;
      hovered = !!hit;
      const thx = hit ? (hit.uv.y - .5) * -.28 : 0, thy = hit ? (hit.uv.x - .5) * .4 : 0;
      const kt = 1 - Math.pow(.004, dt);
      rx += (thx - rx) * kt; ry += (thy - ry) * kt; hov += ((hovered ? 1 : 0) - hov) * (1 - Math.pow(.0005, dt));
      g.position.lerpVectors(start.pos, end.pos, o);
      g.position.addScaledVector(mN, Math.sin(o * Math.PI) * 1.1);                  // arc toward us on the way out
      g.position.addScaledVector(mU, Math.sin(t * .8) * .02 * o + (mobile ? 0 : my * .05 * o));
      g.position.addScaledVector(mR, mx * .06 * o);
      g.position.addScaledVector(mN, hov * .14);
      g.scale.setScalar(mix(start.s, end.s, o) * (1 + hov * .04));
      g.quaternion.copy(qMon); g.rotateY(ry + mx * .06 * o); g.rotateX(rx - .04 * o + my * .03 * o); g.rotateZ(Math.sin(t * .6) * .005 * o);
      const vis = clamp((P - .532) / .006);
      K.U.uA.value = vis; K.slab.material.opacity = vis * o; K.edge.material.opacity = vis * o; K.edge.visible = K.slab.visible = o > .02;
      K.BU.uA.value = vis * (.35 + o * .45 + hov * .45);
      K.U.uShine.value = .15 + o * .35 + ry * .9 - rx * .6 + Math.sin(t * .25) * .04; K.U.uHover.value = hov;
      // the web scrolls through its 4 frames, pausing on each
      const w = seg(P, .68, .86) * (K.U.uFrames.value - 1), i = Math.min(Math.floor(w), K.U.uFrames.value - 2);
      K.U.uScroll.value = i + ease(seg(w - i, .3, 1));
    } else hovered = false;
  }

  return {
    update, resize, puntero,
    progreso(v) { tP = clamp(v); },
    // Salta a un progreso y lo asienta (solo ?oficina=captura y QA).
    asentar(v) { tP = P = clamp(v); for (let i = 0; i < 90; i++) update(1 / 60); },
    get P() { return P; }, get abierta() { return a; }, get hovered() { return hovered; }, get mobile() { return mobile; }
  };
}
