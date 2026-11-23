/* ==========================================================================
   ondas.js — "las dos ondas" de la home (desde backup-pre-ondas). Portado del
   prototipo aprobado (Downloads/evimes-home-ondas/js/ondas.js): las dos mitades
   de la onda del logo (cromo y grafito), duras, en un único canvas fijo
   (#ondas) sobre la página. La geometría, los materiales y los movimientos son
   los del prototipo, sin tocar.
   · Anclas: cada sección marca dónde viven las piezas con un elemento vacío
     [data-ondas="<movimiento>"] (+ data-ondas-scale y data-ondas-tempo opcionales:
     tempo .25 = el movimiento a un cuarto de velocidad). Movimientos:
     firma, orbita, espejo, tijera, persecucion, intercambio, apilar, helice,
     encaje, giroscopio. Un ancla puede cambiar el suyo con
     window.EvimesOndas.setStepMotion(el, nombre).
   · Lo carga js/home.js con import() en un momento libre tras el primer
     pintado. Montaje troceado (js/escenas.js → EV.gpu): la extrusión en
     js/geo-worker.js (mismo Three.js, mismos parámetros), el PMREM con sus
     shaders compilados antes y compileAsync antes del primer render.
   · Bucle: gsap.ticker (el único de la web). Parado con la pestaña oculta o
     cuando ningún ancla está cerca de la pantalla. pixelRatio ≤ 2 (1,5 en móvil).
   · Movimiento reducido: quietas formando la firma (solo se recolocan con el
     scroll, sin muelles, sin destello). Sin WebGL: no se muestra nada.
   ========================================================================== */
import * as THREE from 'three';

const EV = window.EV || {};
const G = EV.gpu || null;
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const movil = matchMedia('(max-width: 860px), (pointer: coarse)').matches;
const cv = document.getElementById('ondas');

export const listo = cv ? (G ? G.turno(montar, 10) : montar()).catch(e => { console.warn('[ondas] sin WebGL: no se muestran', e); return null; }) : Promise.resolve(null);

async function montar() {
  const cede = G ? G.cede : () => new Promise(r => setTimeout(r, 0));
  const renderer = new THREE.WebGLRenderer({ canvas: cv, alpha: true, antialias: true, powerPreference: 'high-performance' });
  if (G) G.sinEsperas(renderer); else renderer.debug.checkShaderErrors = false;
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, movil ? 1.5 : 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.1;
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(28, 1, .1, 100);
  camera.position.set(0, 0, 10);

  /* ---------- neutral studio for reflections ---------- */
  {
    const c = document.createElement('canvas'); c.width = 1024; c.height = 512; const g = c.getContext('2d');
    const bg = g.createLinearGradient(0, 0, 0, 512);
    bg.addColorStop(0, '#4a4d54'); bg.addColorStop(.45, '#1d1f23'); bg.addColorStop(.55, '#141518'); bg.addColorStop(1, '#08080a');
    g.fillStyle = bg; g.fillRect(0, 0, 1024, 512);
    const box = (x, y, w, h, a) => { const gr = g.createLinearGradient(x, y, x, y + h); gr.addColorStop(0, 'rgba(255,255,255,0)'); gr.addColorStop(.5, `rgba(255,255,255,${a})`); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(x, y, w, h); };
    g.fillStyle = 'rgba(235,238,242,.6)'; g.fillRect(0, 0, 1024, 150);
    [[100, .9], [380, .7], [620, .95], [880, .6]].forEach(([x, a]) => { const gr = g.createLinearGradient(x, 0, x + 70, 0); gr.addColorStop(0, 'rgba(255,255,255,0)'); gr.addColorStop(.5, `rgba(255,255,255,${a})`); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(x, 120, 70, 260); });
    box(90, 40, 600, 160, 1); box(0, 190, 1024, 26, .6); box(560, 300, 380, 70, .7); box(0, 250, 1024, 60, .4); box(300, 420, 500, 40, .4);
    const t = new THREE.CanvasTexture(c); t.mapping = THREE.EquirectangularReflectionMapping; t.colorSpace = THREE.SRGBColorSpace;
    if (G) scene.environment = await G.pmrem(THREE, renderer, t);      // el mismo fromEquirectangular, con sus shaders compilados antes
    else { const pm = new THREE.PMREMGenerator(renderer); scene.environment = pm.fromEquirectangular(t).texture; pm.dispose(); }
    t.dispose();
  }
  await cede();

  /* ---------- geometry: the logo wave cut in two boomerang blades ---------- */
  const P = [[0, .506], [.107, .536], [.203, .545], [.574, .485], [.67, .467], [.813, .455], [.909, .467], [1, .495]];
  const curve = new THREE.CatmullRomCurve3(P.map(([x, y]) => new THREE.Vector3(x, -(y - .5), 0)), false, 'centripetal');
  const L = 3.4, AMP = 2.7;
  const wavePt = t => { const p = curve.getPointAt(Math.min(1, Math.max(0, t))); return new THREE.Vector2((p.x - .5) * L, p.y * L * AMP * .5); };
  function profile(tOuter, tInner) {
    const N = 140, W = .125, top = [], bot = [], dt = Math.sign(tInner - tOuter) * .0015;
    for (let i = 0; i <= N; i++) {
      const u = i / N, t = tOuter + (tInner - tOuter) * u;
      const p = wavePt(t), p2 = wavePt(t + dt), tg = p2.clone().sub(p).normalize(), n = new THREE.Vector2(-tg.y, tg.x);
      const w = W * Math.pow(Math.sin(Math.PI * .5 * Math.min(1, u * 1.3)), .9) * (1 - .12 * Math.max(0, u - .85) / .15) + .006;
      top.push(p.clone().addScaledVector(n, w)); bot.push(p.clone().addScaledVector(n, -w));
    }
    const c = top[N].clone().add(bot[N]).multiplyScalar(.5), r = top[N].distanceTo(bot[N]) / 2;
    const a0 = Math.atan2(top[N].y - c.y, top[N].x - c.x), fw = wavePt(tInner).sub(wavePt(tInner - dt)).normalize();
    const mid = a0 - Math.PI / 2, sg = (Math.cos(mid) * fw.x + Math.sin(mid) * fw.y) > 0 ? -1 : 1;
    const cap = []; for (let k = 1; k < 18; k++) { const a = a0 + sg * Math.PI * k / 18; cap.push(new THREE.Vector2(c.x + Math.cos(a) * r, c.y + Math.sin(a) * r)); }
    const pts = [...top, ...cap, ...bot.slice().reverse()];
    let area = 0; for (let i = 0; i < pts.length; i++) { const q = pts[i], w = pts[(i + 1) % pts.length]; area += q.x * w.y - w.x * q.y; }
    return area < 0 ? pts.reverse() : pts;
  }
  /* geometry + a colour gradient baked in vertex colours: each blade fades toward the SAME mid tone at its
     inner end, so when they lock into the logo the seam reads as one continuous piece.
     Todo esto (extrusión, centrado, normales y colores) va en js/geo-worker.js (op 'ondas'): mismo
     Three.js, mismos parámetros, la misma malla. Sin EV.gpu, aquí mismo con el código de siempre. */
  const SEAM = new THREE.Color('#9a9ea6');
  const EXTRUDE = { depth: .07, bevelEnabled: true, bevelThickness: .055, bevelSize: .045, bevelSegments: 12, curveSegments: 24 };
  function blade(g, outerCol, innerAtPlusX) {
    g.computeBoundingBox();
    const c = new THREE.Vector3(); g.boundingBox.getCenter(c); g.translate(-c.x, -c.y, 0); g.computeVertexNormals();
    const pos = g.attributes.position, col = new Float32Array(pos.count * 3), bb = g.boundingBox, w = bb.max.x - bb.min.x, oc = new THREE.Color(outerCol), tmp = new THREE.Color();
    for (let i = 0; i < pos.count; i++) {
      let u = (pos.getX(i) + c.x - bb.min.x) / w; if (!innerAtPlusX) u = 1 - u;   // 0 = outer tip, 1 = inner end
      const k = Math.pow(Math.max(0, (u - .35) / .65), 1.6);                       // keep the body pure, blend near the seam
      tmp.copy(oc).lerp(SEAM, k); col[i * 3] = tmp.r; col[i * 3 + 1] = tmp.g; col[i * 3 + 2] = tmp.b;
    }
    g.setAttribute('color', new THREE.BufferAttribute(col, 3));
    return { g, c };
  }
  const pieza = (pts, outerCol, innerAtPlusX) => G
    ? G.geometria(THREE, { tipo: 'extrude', shapes: new THREE.Shape(pts).toJSON(), opts: EXTRUDE }, [['translate', 0, 0, -.035], ['ondas', outerCol, innerAtPlusX, '#9a9ea6']])
        .then(g => ({ g, c: new THREE.Vector3().fromArray(g.userData.extra.c) }))
    : Promise.resolve(blade(new THREE.ExtrudeGeometry(new THREE.Shape(pts), EXTRUDE).translate(0, 0, -.035), outerCol, innerAtPlusX));
  const [{ g: gA, c: cA }, { g: gB, c: cB }] = await Promise.all([pieza(profile(0, .497), '#eef0f3', true), pieza(profile(1, .503), '#41454b', false)]);
  await cede();

  /* brushed micro-texture for the graphite blade */
  const brushed = (() => {
    const c = document.createElement('canvas'); c.width = 512; c.height = 64; const g = c.getContext('2d');
    g.fillStyle = '#808080'; g.fillRect(0, 0, 512, 64);
    for (let i = 0; i < 900; i++) { const y = Math.random() * 64, a = .05 + Math.random() * .12; g.fillStyle = Math.random() < .5 ? `rgba(0,0,0,${a})` : `rgba(255,255,255,${a})`; g.fillRect(0, y, 512, Math.random() < .2 ? 1 : .5); }
    const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(1.5, 6); return t;
  })();

  /* light sweep: one band of light travels along the wave when the pieces lock into the logo */
  function withSweep(mat) {
    mat.onBeforeCompile = sh => {
      sh.uniforms.uSweep = { value: 0 }; sh.uniforms.uSweepAmt = { value: 0 }; mat.userData.sh = sh;
      sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vWP;')
        .replace('#include <worldpos_vertex>', '#include <worldpos_vertex>\nvWP=(modelMatrix*vec4(transformed,1.)).xyz;');
      sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying vec3 vWP;uniform float uSweep,uSweepAmt;')
        .replace('#include <dithering_fragment>', 'float sw=exp(-pow((vWP.x-uSweep)*3.2,2.));gl_FragColor.rgb+=vec3(.9,.92,.95)*sw*uSweepAmt;\n#include <dithering_fragment>');
    };
    return mat;
  }
  const chrome = withSweep(new THREE.MeshPhysicalMaterial({ color: 0xffffff, vertexColors: true, metalness: 1, roughness: .09, clearcoat: .9, clearcoatRoughness: .05, envMapIntensity: 2 }));
  const graph = withSweep(new THREE.MeshPhysicalMaterial({ color: 0xffffff, vertexColors: true, metalness: 1, roughness: .3, roughnessMap: brushed, bumpMap: brushed, bumpScale: .4, clearcoat: .7, clearcoatRoughness: .12, envMapIntensity: 1.6 }));
  const A = new THREE.Mesh(gA, chrome), B = new THREE.Mesh(gB, graph);

  /* gyroscope orbits */
  const ringMat = new THREE.MeshPhysicalMaterial({ color: 0xdfe3e8, metalness: 1, roughness: .2, envMapIntensity: 1.6, transparent: true, opacity: 0, depthWrite: false });
  const ring1 = new THREE.Mesh(new THREE.TorusGeometry(1, .005, 8, 240), ringMat), ring2 = ring1.clone();

  /* soft contact shadows (only visible on the grey sections) */
  const shTex = (() => { const c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d'); const gr = g.createRadialGradient(64, 64, 4, 64, 64, 64); gr.addColorStop(0, 'rgba(0,0,0,.55)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.fillRect(0, 0, 128, 128); return new THREE.CanvasTexture(c); })();
  const shMat = new THREE.MeshBasicMaterial({ map: shTex, transparent: true, depthWrite: false, opacity: 0 });
  const shA = new THREE.Mesh(new THREE.PlaneGeometry(1.9, .34), shMat), shB = new THREE.Mesh(new THREE.PlaneGeometry(1.9, .34), shMat);

  const rig = new THREE.Group(); rig.add(A, B, ring1, ring2); scene.add(rig, shA, shB);

  /* ---------- motion library (local poses, centred on 0) ---------- */
  const V = (x, y, z) => new THREE.Vector3(x, y, z), E = (x, y, z) => new THREE.Euler(x, y, z);
  const ease = x => x < .5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
  const tri = x => 1 - Math.abs((x % 2) - 1);
  const n1 = V(0, 1, .42).normalize(), n2 = V(1, .1, .35).normalize(), R0 = 1.05;
  function ringPose(n, th) {
    const e1 = V(0, 0, 1).cross(n).normalize(), e2 = n.clone().cross(e1).normalize();
    const p = e1.clone().multiplyScalar(Math.cos(th) * R0).addScaledVector(e2, Math.sin(th) * R0);
    const tg = e1.clone().multiplyScalar(-Math.sin(th)).addScaledVector(e2, Math.cos(th)).normalize();
    const z = tg.clone().cross(n).normalize(), y = z.clone().cross(tg).normalize();
    return [p, new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(tg, y, z))];
  }
  const M = {
    firma: t => { const g = .035 + .03 * (.5 - .5 * Math.cos(t * 1.4)); return [V(cA.x - g, cA.y, 0), E(.1, -.22 + Math.sin(t * .45) * .07, 0), V(cB.x + g, cB.y, 0), E(.1, -.22 + Math.sin(t * .45) * .07, 0)]; },
    orbita: t => { const a = t * .8, R = 1.15; return [V(Math.cos(a) * R, Math.sin(a) * R * .22, Math.sin(a) * R), E(.15, -a * .5, .08), V(-Math.cos(a) * R, -Math.sin(a) * R * .22, -Math.sin(a) * R), E(.15, -a * .5 + Math.PI, -.08)]; },
    espejo: t => { const o = ease(tri(t * .42)), sp = .25 + o * 1.0, r = o * .9; return [V(cA.x - sp, cA.y + o * .15, 0), E(0, -r, o * .18), V(cB.x + sp, cB.y + o * .15, 0), E(0, r, -o * .18)]; },
    tijera: t => { const o = .15 + .5 * (.5 - .5 * Math.cos(t * 1.3)); return [V(0, 0, .12), E(.1, -.2, o), V(0, 0, -.12), E(.1, -.2, -o + Math.PI)]; },
    persecucion: t => { const p = s => { const k = 1.35 / (1 + Math.sin(s) ** 2); return V(Math.cos(s) * k * 1.2, Math.sin(s) * Math.cos(s) * k * .55, Math.sin(s) * .5); };
      const s = t * .75, dA = p(s + .02).sub(p(s)), dB = p(s - 1.1 + .02).sub(p(s - 1.1));
      return [p(s), E(.1, 0, Math.atan2(dA.y, dA.x)), p(s - 1.1), E(.1, 0, Math.atan2(dB.y, dB.x))]; },
    intercambio: t => { const k = ease(tri(t * .33)), a = k * Math.PI, x = Math.cos(a) * 1.2, z = Math.sin(a) * .9; return [V(-x, Math.sin(a) * .18, z), E(.1, -.2 + k * .4, 0), V(x, -Math.sin(a) * .18, -z), E(.1, -.2 + k * .4, 0)]; },
    apilar: t => { const s = Math.sin(t * 1.0) * .5; return [V(s, .2, 0), E(.25, -.3, 0), V(-s, -.2, 0), E(.25, -.3, Math.PI)]; },
    helice: t => { const a = t * 1.15; return [V(0, Math.cos(a) * .32, Math.sin(a) * .32), E(a, -.25, 0), V(0, -Math.cos(a) * .32, -Math.sin(a) * .32), E(a + Math.PI, -.25, Math.PI)]; },
    encaje: t => { const c = (t * .4) % 1; let o; if (c < .35) o = 1 - ease(c / .35); else if (c < .75) o = 0; else o = ease((c - .75) / .25);
      const sp = .04 + o; return [V(cA.x - sp, cA.y + o * .3, o * .4), E(.1, -.25 + o * .6, o * .3), V(cB.x + sp, cB.y - o * .3, -o * .4), E(.1, -.25 - o * .6, -o * .3)]; },
    giroscopio: t => { const [pa, qa] = ringPose(n1, t * 3.0), [pb, qb] = ringPose(n2, t * 3.4 + 2.1); return [pa, qa, pb, qb, .68, 1]; },
  };
  function targetPose(name, t) {
    const r = (M[name] || M.firma)(t);
    const q = x => x.isQuaternion ? x : new THREE.Quaternion().setFromEuler(x);
    return { pA: r[0], qA: q(r[1]), pB: r[2], qB: q(r[3]), s: r[4] ?? 1, rings: r[5] ?? 0 };
  }

  /* ---------- anchors on the page ----------
     Un IntersectionObserver dice qué anclas están cerca de la pantalla (media pantalla de margen):
     solo esas se miden por fotograma; si no hay ninguna, el bucle se para. */
  let anchors = [], stepMotion = null, stepEl = null, forceFirma = 0;
  const cerca = new Set();
  const io = new IntersectionObserver(es => { es.forEach(e => { if (e.isIntersecting) cerca.add(e.target); else cerca.delete(e.target); }); }, { rootMargin: '50% 0px' });
  function collect() {
    const nuevos = [...document.querySelectorAll('[data-ondas]')];
    anchors.forEach(el => { if (!nuevos.includes(el)) { io.unobserve(el); cerca.delete(el); } });
    nuevos.forEach(el => { if (!anchors.includes(el)) io.observe(el); });
    anchors = nuevos;
  }
  collect();
  function activeAnchor() {
    // the anchor whose box is closest to the viewport centre wins (if none is on screen, the nearest one nearby)
    const cy = innerHeight / 2; let best = null, bd = 1e9;
    for (const el of cerca) { const r = el.getBoundingClientRect(); if (!r.height && !r.width) continue; const fuera = r.bottom < 0 || r.top > innerHeight;
      const d = Math.abs((r.top + r.bottom) / 2 - cy) + (fuera ? 1e5 : 0); if (d < bd) { bd = d; best = el; } }
    return best;
  }
  const worldPerPx = () => 2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * camera.position.z / innerHeight;

  /* ---------- springs: pieces chase their targets with weight (slight overshoot) ---------- */
  function body() { return { p: V(0, 0, 0), v: V(0, 0, 0), q: new THREE.Quaternion(), w: V(0, 0, 0) }; }
  const bA = body(), bB = body();
  const K = 46, C = 2 * .62 * Math.sqrt(K), KR = 38, CR = 2 * .66 * Math.sqrt(KR);
  const tq = new THREE.Quaternion(), ax = V(0, 0, 0), dq = new THREE.Quaternion();
  function springTo(b, p, q, dt) {
    b.v.addScaledVector(p.clone().sub(b.p), K * dt).multiplyScalar(Math.exp(-C * dt)); b.p.addScaledVector(b.v, dt);
    tq.copy(q).multiply(b.q.clone().invert()); if (tq.w < 0) { tq.x *= -1; tq.y *= -1; tq.z *= -1; tq.w *= -1; }
    const ang = 2 * Math.acos(Math.min(1, tq.w)), s = Math.sqrt(1 - tq.w * tq.w);
    if (s > 1e-5) ax.set(tq.x / s, tq.y / s, tq.z / s).multiplyScalar(ang); else ax.set(0, 0, 0);
    b.w.addScaledVector(ax, KR * dt).multiplyScalar(Math.exp(-CR * dt));
    const wl = b.w.length(); if (wl > 1e-6) { dq.setFromAxisAngle(b.w.clone().divideScalar(wl), wl * dt); b.q.premultiply(dq); }
  }
  // movimiento reducido: sin muelles, en su sitio
  function snapTo(b, p, q) { b.p.copy(p); b.v.set(0, 0, 0); b.q.copy(q); b.w.set(0, 0, 0); }

  /* ---------- pointer ---------- */
  const mouse = { x: 0, y: 0, wx: 0, wy: 0, on: false };
  if (!reduce) {
    addEventListener('pointermove', e => { mouse.x = e.clientX / innerWidth * 2 - 1; mouse.y = -(e.clientY / innerHeight * 2 - 1); mouse.on = true; }, { passive: true });
    document.documentElement.addEventListener('pointerleave', () => { mouse.on = false; });
    // con el dedo: al levantarlo, deja de apartarlas
    addEventListener('pointerup', e => { if (e.pointerType !== 'mouse') mouse.on = false; }, { passive: true });
    addEventListener('pointercancel', () => { mouse.on = false; }, { passive: true });
    addEventListener('click', e => {
      // click near the pieces: they lock into the logo for a moment
      const wpp = worldPerPx(), wx = (e.clientX - innerWidth / 2) * wpp, wy = -(e.clientY - innerHeight / 2) * wpp;
      if (Math.hypot(wx - rig.position.x, wy - rig.position.y) < 1.6 * rig.scale.x) forceFirma = 2.6;
    });
  }

  /* ---------- loop ---------- */
  let T = 0, tempo = 1, lastFirma = false, sweepT = 1;
  let scale = 1, center = V(0, 0, 0), shadowOn = 0, primero = true, sucio = true, ultima = '';
  function size() { const w = innerWidth, h = innerHeight; renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix(); sucio = true; }
  size(); addEventListener('resize', () => { size(); collect(); });
  function step(dt) {
    forceFirma = Math.max(0, forceFirma - dt);
    const el = activeAnchor();
    // el ritmo del ancla (data-ondas-tempo), cambiado sin saltos: los muelles siguen a su velocidad
    const ritmo = (el && parseFloat(el.dataset.ondasTempo)) || 1;
    tempo += (ritmo - tempo) * (1 - Math.exp(-dt * 3));
    T += dt * tempo;
    let name = (stepEl && el === stepEl && stepMotion) ? stepMotion : (el ? el.dataset.ondas : 'firma');
    if (forceFirma > 0) name = 'firma';
    if (reduce) name = 'firma';
    // anchor -> world centre and size
    const wpp = worldPerPx();
    if (el) {
      const r = el.getBoundingClientRect();
      const tx = ((r.left + r.right) / 2 - innerWidth / 2) * wpp, ty = -((r.top + r.bottom) / 2 - innerHeight / 2) * wpp;
      const ts = Math.min(1.25, Math.max(.45, (r.width * wpp) / 3.6)) * (parseFloat(el.dataset.ondasScale) || 1);
      const k = (primero || reduce) ? 1 : 1 - Math.exp(-dt * 4);           // el primer fotograma (y con movimiento reducido), ya en su sitio
      center.x += (tx - center.x) * k; center.y += (ty - center.y) * k; scale += (ts - scale) * k;
      shadowOn += ((el.closest('.is-grey') ? 1 : 0) - shadowOn) * k;
      primero = false;
    }
    const tp = targetPose(name, reduce ? 0 : T);
    // cursor: lean toward it, step aside if it comes too close
    const mwx = mouse.x * innerWidth / 2 * wpp, mwy = mouse.y * innerHeight / 2 * wpp;
    for (const [p] of [[tp.pA, 1], [tp.pB, -1]]) {
      const wx = center.x + p.x * scale, wy = center.y + p.y * scale, d = Math.hypot(mwx - wx, mwy - wy);
      if (mouse.on && d < .9) { const f = (1 - d / .9) * .35 / scale; p.x += (wx - mwx) / (d || 1) * f; p.y += (wy - mwy) / (d || 1) * f; }
    }
    if (reduce) { snapTo(bA, tp.pA, tp.qA); snapTo(bB, tp.pB, tp.qB); }
    else { springTo(bA, tp.pA, tp.qA, dt); springTo(bB, tp.pB, tp.qB, dt); }
    A.position.copy(bA.p); A.quaternion.copy(bA.q); B.position.copy(bB.p); B.quaternion.copy(bB.q);
    A.scale.setScalar(A.scale.x + (tp.s - A.scale.x) * (1 - Math.exp(-dt * 5))); B.scale.copy(A.scale);
    ringMat.opacity += (tp.rings * .5 - ringMat.opacity) * (1 - Math.exp(-dt * 4)); ring1.visible = ring2.visible = ringMat.opacity > .01;
    ring1.scale.setScalar(R0); ring2.scale.setScalar(R0); ring1.quaternion.setFromUnitVectors(V(0, 0, 1), n1); ring2.quaternion.setFromUnitVectors(V(0, 0, 1), n2);
    rig.position.set(center.x, center.y, 0); rig.scale.setScalar(scale);
    rig.rotation.set(-mouse.y * .1, mouse.x * .16, 0);
    // light sweep each time they lock into the logo
    const isF = name === 'firma' && !reduce;
    if (isF && !lastFirma) sweepT = -.6; lastFirma = isF;
    sweepT = Math.min(1.6, sweepT + dt / 1.3);
    const sx = center.x + (-2.2 + 4.4 * Math.max(0, Math.min(1, sweepT))) * scale, sa = sweepT > 0 && sweepT < 1 ? Math.sin(Math.PI * sweepT) * .55 : 0;
    for (const m of [chrome, graph]) if (m.userData.sh) { m.userData.sh.uniforms.uSweep.value = sx; m.userData.sh.uniforms.uSweepAmt.value = sa; }
    // contact shadows on grey
    rig.updateMatrixWorld();
    for (const [sh, mesh] of [[shA, A], [shB, B]]) { const wp = mesh.getWorldPosition(V(0, 0, 0)); sh.position.set(wp.x, wp.y - .55 * scale, -.6); sh.scale.setScalar(scale * mesh.scale.x); }
    shMat.opacity = shadowOn * .5 * (1 - tp.rings);
    return el;
  }

  // start already locked in the logo
  { const tp = targetPose('firma', 0); bA.p.copy(tp.pA); bA.q.copy(tp.qA); bB.p.copy(tp.pB); bB.q.copy(tp.qB); }

  // shaders compilados en paralelo antes del primer render (con el sweep ya inyectado)
  await renderer.compileAsync(scene, camera);
  await cede();
  // primer uso de cada programa y subida de cada malla, una pieza por tarea (el canvas aún no se ve):
  // así el primer fotograma de verdad no junta todo ese trabajo en una tarea larga
  {
    const todas = [A, B, ring1, ring2, shA, shB], antes = todas.map(m => m.visible);
    for (const una of [A, B, ring1, shA]) {
      todas.forEach(m => { m.visible = m === una; });
      renderer.render(scene, camera);
      await cede();
    }
    todas.forEach((m, i) => { m.visible = antes[i]; });
  }

  let parado = false;
  function frame(dms) {
    if (document.hidden) return;
    if (!cerca.size) {                                  // ningún ancla cerca: se para (y no deja un fotograma pintado)
      if (!parado) { parado = true; renderer.clear(); }
      return;
    }
    if (parado) { parado = false; primero = true; }     // vuelve: en su ancla desde el primer fotograma
    const el = step(Math.min(.05, (dms || 16.7) / 1000));
    if (reduce) {                                       // quietas: solo se pinta si el ancla se ha movido
      const r = el && el.getBoundingClientRect(), k = r ? Math.round(r.top) + ',' + Math.round(r.left) + ',' + Math.round(r.width) : '';
      if (k === ultima && !sucio) return; ultima = k;
    }
    sucio = false;
    renderer.render(scene, camera);
  }
  if (window.gsap) gsap.ticker.add((time, dms) => frame(dms));
  else { let l = 0; const f = now => { requestAnimationFrame(f); frame(l ? now - l : 16.7); l = now; }; requestAnimationFrame(f); }
  frame(16.7);
  cv.classList.add('is-viva');

  window.EvimesOndas = {
    setStepMotion(el, name) { stepEl = el; stepMotion = name; },
    refresh: collect,
    __step(s) { for (let i = 0; i < Math.round(s * 60); i++) step(1 / 60); renderer.render(scene, camera); },
  };
  window.__ondasReady = true;
  window.dispatchEvent(new Event('ondas:listo'));
  return window.EvimesOndas;
}
