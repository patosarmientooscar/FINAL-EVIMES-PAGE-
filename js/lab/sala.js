/* ==========================================================================
   lab/sala.js — laboratorio.html: la sala 3D del laboratorio (desde
   antes-laboratorio-3d). Es el script de la sala aprobada
   (Downloads/evimes-laboratorio-farol/sala.html) tal cual, con lo justo para
   vivir en la web:
   · sin el modo foto (?shot) ni los proyectores de fotos (?proj, tecla P);
   · el canvas va dentro de .sala (debajo siguen el texto sin 3D y el pie);
   · una zona por gesto mientras la sala está arriba; en la última zona, un
     gesto nuevo hacia abajo baja al texto (y la rueda es de la página);
   · sin WebGL: html.sala-sin-3d y se ve el texto; fuera de pantalla no pinta.
   Las paradas, los vuelos, las fotos 360° y Farol (js/lab/farol.js), igual.
   Estilos: css/lab-sala.css
   ========================================================================== */
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { createFarol } from './farol.js';

/* Same plan as the 3D maquette (metres). x: left windows (-3.2) → right wall (8); y in the plan = depth = -z here. Floor at 0. */
const XL = -3.2, XR = 8, D = 18, H = 3.2;
const P = (x, y, h = 0) => new THREE.Vector3(x, h, -y);   // plan → world

const sala = document.querySelector('.sala');
let renderer = null;
try { renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' }); }
catch (e) { document.documentElement.classList.add('sala-sin-3d'); console.warn('[sala] sin WebGL: se queda el texto', e); }

sala3d: {   // todo lo que sigue necesita WebGL
if (!renderer) break sala3d;
renderer.setPixelRatio(Math.min(devicePixelRatio, 1.75));
renderer.setSize(innerWidth, innerHeight);
renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = .82;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
sala.prepend(renderer.domElement);   // dentro de la sala (la página sigue debajo)
const scene = new THREE.Scene(); scene.background = new THREE.Color(0x0a0c12);
scene.fog = new THREE.Fog(0x0a0c12, 22, 40);
const pmrem = new THREE.PMREMGenerator(renderer);
scene.environment = pmrem.fromScene(new RoomEnvironment(), .04).texture;
scene.environmentIntensity = .35;
const cam = new THREE.PerspectiveCamera(58, innerWidth / innerHeight, .05, 80);

/* ---------- procedural textures (no image files needed) ---------- */
function canvasTex(w, h, draw, repeat) {
  const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
  if (repeat) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(...repeat); }
  return t;
}
let seed = 7; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
const oak = canvasTex(1024, 1024, (g, w, h) => {
  const rows = 8, rh = h / rows;
  for (let r = 0; r < rows; r++) {
    let x = -rnd() * 400;
    while (x < w) {
      const len = 380 + rnd() * 320, tone = 168 + rnd() * 28;
      g.fillStyle = `rgb(${tone + 22},${tone - 12},${tone - 60})`; g.fillRect(x, r * rh, len, rh);
      for (let i = 0; i < 26; i++) { g.strokeStyle = `rgba(110,70,35,${.05 + rnd() * .09})`; g.lineWidth = 1 + rnd() * 2; const yy = r * rh + rnd() * rh; g.beginPath(); g.moveTo(x, yy); g.bezierCurveTo(x + len * .3, yy + (rnd() - .5) * 8, x + len * .7, yy + (rnd() - .5) * 8, x + len, yy + (rnd() - .5) * 6); g.stroke(); }
      g.fillStyle = 'rgba(60,40,20,.35)'; g.fillRect(x, r * rh, 2, rh); x += len;
    }
    g.fillStyle = 'rgba(60,40,20,.3)'; g.fillRect(0, r * rh, w, 2);
  }
}, [4.5, 10]);
const city = canvasTex(2048, 512, (g, w, h) => {
  const sky = g.createLinearGradient(0, 0, 0, h); sky.addColorStop(0, '#0d1838'); sky.addColorStop(.55, '#22346b'); sky.addColorStop(.8, '#3b3f6e'); sky.addColorStop(1, '#1a1c2c');
  g.fillStyle = sky; g.fillRect(0, 0, w, h);
  for (let layer = 0; layer < 3; layer++) {
    let x = 0; const base = h * (.62 + layer * .1), shade = 14 + layer * 8;
    while (x < w) {
      const bw = 30 + rnd() * 90, bh = (80 + rnd() * 220) * (1 - layer * .25);
      g.fillStyle = `rgb(${shade},${shade + 3},${shade + 12})`; g.fillRect(x, base - bh, bw, bh + h);
      for (let yy = base - bh + 6; yy < h; yy += 9) for (let xx = x + 4; xx < x + bw - 4; xx += 7) if (rnd() < .22) { g.fillStyle = rnd() < .8 ? `rgba(255,${190 + rnd() * 50},${110 + rnd() * 60},${.5 + rnd() * .5})` : 'rgba(180,210,255,.7)'; g.fillRect(xx, yy, 3, 4); }
      x += bw + rnd() * 10;
    }
  }
});
const codeTex = canvasTex(512, 320, (g, w, h) => {
  g.fillStyle = '#0b0e14'; g.fillRect(0, 0, w, h);
  for (let i = 0; i < 26; i++) { const ind = (i % 5) * 14; let x = 16 + ind; const y = 16 + i * 11.5;
    for (let k = 0; k < 4 + rnd() * 5; k++) { const len = 12 + rnd() * 50; g.fillStyle = ['#e9e7e2', '#ff8a3d', '#8a8f98', '#c9b28a'][Math.floor(rnd() * 4)]; g.globalAlpha = .75; g.fillRect(x, y, len, 4); x += len + 6; } }
  g.globalAlpha = 1;
});
const leafTex = canvasTex(256, 256, (g) => { g.fillStyle = '#2f5a2a'; g.beginPath(); g.ellipse(128, 128, 70, 120, 0, 0, Math.PI * 2); g.fill(); g.strokeStyle = '#4c7a3e'; g.lineWidth = 4; g.beginPath(); g.moveTo(128, 20); g.lineTo(128, 236); g.stroke(); });

/* ---------- materials ---------- */
const M = {
  oak: new THREE.MeshStandardMaterial({ map: oak, roughness: .42, metalness: 0, envMapIntensity: .8 }),
  oakLight: new THREE.MeshStandardMaterial({ color: 0xd8b48a, map: oak, roughness: .55 }),
  wall: new THREE.MeshStandardMaterial({ color: 0xd9d2c8, roughness: .92 }),
  white: new THREE.MeshStandardMaterial({ color: 0xf1eee8, roughness: .6 }),
  ceiling: new THREE.MeshStandardMaterial({ color: 0xe6e0d6, roughness: .95, emissive: 0x2a2219, emissiveIntensity: .6 }),
  frame: new THREE.MeshStandardMaterial({ color: 0x15161a, roughness: .4, metalness: .6 }),
  glass: new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: .04, metalness: 0, transparent: true, opacity: .12, envMapIntensity: 1.6, depthWrite: false }),
  screen: new THREE.MeshStandardMaterial({ color: 0x050507, roughness: .25, metalness: .2, envMapIntensity: 1.2 }),
  code: new THREE.MeshBasicMaterial({ map: codeTex, toneMapped: false }),
  black: new THREE.MeshStandardMaterial({ color: 0x111215, roughness: .5, metalness: .4 }),
  orange: new THREE.MeshStandardMaterial({ color: 0xc8541c, roughness: .7 }),
  lampShade: new THREE.MeshStandardMaterial({ color: 0xff7a22, roughness: .35, emissive: 0xff6a10, emissiveIntensity: .25 }),
  dark: new THREE.MeshStandardMaterial({ color: 0x1b1a19, roughness: .5, metalness: .2 }),
  pot: new THREE.MeshStandardMaterial({ color: 0xf3f0ea, roughness: .5 }),
  leaf: new THREE.MeshStandardMaterial({ map: leafTex, alphaTest: .5, side: THREE.DoubleSide, roughness: .7 }),
  city: new THREE.MeshBasicMaterial({ map: city, toneMapped: false }),
  down: new THREE.MeshBasicMaterial({ color: 0xfff1dd, toneMapped: false }),
};
// furniture detail: real-world materials so the photo pass has real shapes to work with
const fabricTex = canvasTex(256, 256, (g, w, h) => { g.fillStyle = '#808080'; g.fillRect(0, 0, w, h);
  for (let y = 0; y < h; y += 2) for (let x = 0; x < w; x += 2) { const v = 118 + rnd() * 24 + ((x + y) % 4 ? 0 : 10); g.fillStyle = `rgb(${v},${v},${v})`; g.fillRect(x, y, 2, 2); } }, [6, 6]);
const screenUI = (hero) => canvasTex(640, 360, (g, w, h) => {            // abstract web layout, no readable text
  g.fillStyle = '#101114'; g.fillRect(0, 0, w, h);
  g.fillStyle = 'rgba(255,255,255,.12)'; g.fillRect(24, 22, 60, 8); for (let i = 0; i < 4; i++) g.fillRect(w - 250 + i * 56, 24, 38, 5);
  const gr = g.createLinearGradient(24, 60, w - 24, h - 90); hero.forEach((c, i) => gr.addColorStop(i / (hero.length - 1), c));
  g.fillStyle = gr; g.beginPath(); g.roundRect(24, 56, w - 48, 190, 10); g.fill();
  g.fillStyle = 'rgba(255,255,255,.85)'; g.fillRect(52, 100, 220, 18); g.fillRect(52, 128, 160, 18);
  g.fillStyle = 'rgba(255,255,255,.45)'; g.fillRect(52, 164, 200, 6); g.fillRect(52, 176, 170, 6);
  g.fillStyle = '#ffffff'; g.beginPath(); g.roundRect(52, 196, 92, 26, 13); g.fill();
  for (let i = 0; i < 3; i++) { g.fillStyle = 'rgba(255,255,255,.08)'; g.beginPath(); g.roundRect(24 + i * ((w - 48) / 3 + 4), 262, (w - 48) / 3 - 8, 76, 8); g.fill(); }
});
const keysTex = canvasTex(256, 96, (g, w, h) => { g.fillStyle = '#d9d9d6'; g.fillRect(0, 0, w, h); g.fillStyle = '#f4f4f2';
  for (let r = 0; r < 5; r++) for (let c = 0; c < 15; c++) g.fillRect(4 + c * 16.8, 4 + r * 18, 14, 15); });
Object.assign(M, {
  chrome: new THREE.MeshStandardMaterial({ color: 0xd4d6da, roughness: .22, metalness: 1, envMapIntensity: 1.4 }),
  steel: new THREE.MeshStandardMaterial({ color: 0xb9bcc0, roughness: .32, metalness: .9, envMapIntensity: 1.2 }),
  plastic: new THREE.MeshStandardMaterial({ color: 0x1c1d20, roughness: .45, metalness: 0 }),
  fabricOr: new THREE.MeshStandardMaterial({ color: 0xc9561f, roughness: .95, bumpMap: fabricTex, bumpScale: .6 }),
  fabricBk: new THREE.MeshStandardMaterial({ color: 0x202124, roughness: .95, bumpMap: fabricTex, bumpScale: .6 }),
  stone: new THREE.MeshStandardMaterial({ color: 0xf2efea, roughness: .35, metalness: 0, envMapIntensity: .9 }),
  ceramic: new THREE.MeshStandardMaterial({ color: 0xf7f5f1, roughness: .25, envMapIntensity: 1 }),
  soil: new THREE.MeshStandardMaterial({ color: 0x2a2018, roughness: 1 }),
  beans: new THREE.MeshStandardMaterial({ color: 0x3a2416, roughness: .5, transparent: true, opacity: .92 }),
  keys: new THREE.MeshStandardMaterial({ map: keysTex, roughness: .6 }),
  uiA: new THREE.MeshBasicMaterial({ map: screenUI(['#ff7a22', '#ff3d7f', '#7a5cff']), toneMapped: false }),   // left: creative agencies
  uiB: new THREE.MeshBasicMaterial({ map: screenUI(['#1f2a44', '#3b6cff', '#22d3c5']), toneMapped: false }),   // right: landing prototypes
});
const part = (g, geo, m, x, y, z) => { const o = new THREE.Mesh(geo, m); o.position.set(x, y, z); o.castShadow = o.receiveShadow = true; g.add(o); return o; };
const group = (x, y, rot = 0, h = 0) => { const g = new THREE.Group(); g.position.copy(P(x, y, h)); g.rotation.y = rot; scene.add(g); return g; };
const bend = (geo, k) => { const p = geo.attributes.position; for (let i = 0; i < p.count; i++) p.setZ(i, p.getZ(i) + k * p.getX(i) * p.getX(i)); geo.computeVertexNormals(); return geo; };

/* ---------- helpers ---------- */
const box = (w, h, d, x, y, h0, m, cast = true, recv = true) => { const o = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); o.position.copy(P(x, y, h0 + h / 2)); o.castShadow = cast; o.receiveShadow = recv; scene.add(o); return o; };
const rbox = (w, h, d, r, x, y, h0, m) => { const o = new THREE.Mesh(new RoundedBoxGeometry(w, h, d, 3, r), m); o.position.copy(P(x, y, h0 + h / 2)); o.castShadow = o.receiveShadow = true; scene.add(o); return o; };
const cyl = (r1, r2, h, x, y, h0, m, seg = 40) => { const o = new THREE.Mesh(new THREE.CylinderGeometry(r1, r2, h, seg), m); o.position.copy(P(x, y, h0 + h / 2)); o.castShadow = o.receiveShadow = true; scene.add(o); return o; };

/* ---------- room ---------- */
const floor = new THREE.Mesh(new THREE.PlaneGeometry(XR - XL, D), M.oak); floor.rotation.x = -Math.PI / 2; floor.position.copy(P((XL + XR) / 2, D / 2)); floor.receiveShadow = true; scene.add(floor);
const ceil = new THREE.Mesh(new THREE.PlaneGeometry(XR - XL, D), M.ceiling); ceil.rotation.x = Math.PI / 2; ceil.position.copy(P((XL + XR) / 2, D / 2, H)); scene.add(ceil);
box(XR - XL, H, .2, (XL + XR) / 2, D + .1, 0, M.wall, false);                // back wall
box(.2, H, D, XR + .1, D / 2, 0, M.wall, false);                             // right wall
box(XR - XL, H, .2, (XL + XR) / 2, -.1, 0, M.wall, false);                    // front wall (entrance, closes the room at y = 0)
// entrance door behind the start point: flush white leaf, thin dark frame, slim handle
box(1.16, 2.42, .04, .4, .01, 0, M.dark, false);                              // frame
box(1.0, 2.32, .05, .4, .02, 0, M.white, false);                              // leaf
box(.03, .3, .04, .78, .06, 1.0, M.black, false);                             // handle
box(XR - XL, .12, .03, (XL + XR) / 2, .015, 0, M.white, false);               // skirting front
box(.25, .15, D, XR - .12, D / 2, 0, M.white, false);                        // skirting right
// windows wall: city, glass, mullions, head
const cityPlane = new THREE.Mesh(new THREE.PlaneGeometry(D + 20, 14), M.city); cityPlane.rotation.y = Math.PI / 2; cityPlane.position.copy(P(XL - 9, D / 2, 3.2)); scene.add(cityPlane);
const glassW = new THREE.Mesh(new THREE.PlaneGeometry(D, H), M.glass); glassW.rotation.y = Math.PI / 2; glassW.position.copy(P(XL + .02, D / 2, H / 2)); scene.add(glassW);
for (let y = 0; y <= D; y += 1.5) box(.08, H, .08, XL + .05, y, 0, M.frame, false);
box(.1, .08, D, XL + .05, D / 2, .9, M.frame, false);
box(.35, .35, D, XL + .17, D / 2, H - .35, M.white, false);
// ceiling: recessed downlights + linear diffusers
for (let x of [-1.2, 1.6, 4.4]) for (let y = 2; y < 17; y += 3) { const d = new THREE.Mesh(new THREE.CircleGeometry(.055, 24), M.down); d.rotation.x = Math.PI / 2; d.position.copy(P(x, y, H - .006)); scene.add(d); const r = new THREE.Mesh(new THREE.RingGeometry(.055, .075, 32), M.white); r.rotation.x = Math.PI / 2; r.position.copy(P(x, y, H - .004)); scene.add(r); }
for (let y = 1; y < 17; y += 4) box(.04, .01, 2.4, -1.9, y + 1.2, H - .012, M.frame, false);
// columns
for (const [x, y] of [[-2.45, 6.4], [-2.95, 14.5], [2.66, 12.9]]) cyl(.31, .31, H, x, y, 0, M.white, 48);

/* ---------- entrance: coffee bar ---------- */
rbox(.85, .94, 1.55, .012, -2.55, 5.7, .06, M.white);                       // cabinet
box(.8, .06, 1.5, -2.57, 5.7, 0, M.dark, false);                              // recessed plinth
for (const y of [5.18, 5.7, 6.22]) box(.006, .86, .004, -2.122, y, .1, M.dark, false);   // door gaps (handle-less)
box(.006, .004, 1.5, -2.122, 5.7, .64, M.dark, false);
rbox(.95, .035, 1.65, .006, -2.55, 5.7, 1.0, M.stone);                        // stone top
// espresso machine (front faces the room)
{ const g = group(-2.62, 5.25, Math.PI / 2, 1.035);
  part(g, new RoundedBoxGeometry(.36, .34, .4, 4, .025), M.steel, 0, .17, 0);
  part(g, new THREE.BoxGeometry(.3, .012, .3), M.black, 0, .345, 0);                 // cup warmer
  for (let i = 0; i < 3; i++) part(g, new THREE.CylinderGeometry(.03, .026, .055, 20), M.ceramic, -.08 + i * .08, .38, -.04);
  part(g, new THREE.BoxGeometry(.32, .025, .14), M.black, 0, .012, .2);              // drip tray
  part(g, new THREE.CylinderGeometry(.04, .04, .05, 24), M.chrome, -.06, .22, .2);   // group head
  const pf = part(g, new THREE.CylinderGeometry(.012, .016, .16, 12), M.black, -.06, .19, .3); pf.rotation.x = Math.PI / 2;
  part(g, new THREE.CylinderGeometry(.034, .03, .03, 20), M.chrome, -.06, .19, .21);
  const wand = part(g, new THREE.CylinderGeometry(.005, .005, .2, 8), M.chrome, .12, .14, .22); wand.rotation.z = .25;
  const gauge = part(g, new THREE.CircleGeometry(.03, 24), M.black, .08, .27, .201); part(g, new THREE.RingGeometry(.03, .036, 24), M.chrome, .08, .27, .202);
  part(g, new THREE.CylinderGeometry(.03, .026, .055, 20), M.ceramic, -.06, .052, .19); }
// grinder
{ const g = group(-2.62, 5.72, Math.PI / 2, 1.035);
  part(g, new RoundedBoxGeometry(.14, .26, .2, 3, .015), M.plastic, 0, .13, 0);
  part(g, new THREE.CylinderGeometry(.07, .04, .14, 24), M.beans, 0, .33, 0);
  part(g, new THREE.CylinderGeometry(.072, .072, .015, 24), M.plastic, 0, .405, 0);
  part(g, new THREE.BoxGeometry(.08, .02, .06), M.steel, 0, .06, .1); }
// cups and a glass jar of beans
for (let i = 0; i < 6; i++) { const g = group(-2.42 + (i % 3) * .085, 6.05 + Math.floor(i / 3) * .1, -Math.PI / 2 + i, 1.035);
  part(g, new THREE.CylinderGeometry(.034, .028, .07, 20), M.ceramic, 0, .035, 0);
  const hd = part(g, new THREE.TorusGeometry(.018, .005, 8, 16, Math.PI), M.ceramic, .036, .036, 0); hd.rotation.z = -Math.PI / 2; }
{ const g = group(-2.72, 6.25, 0, 1.035); part(g, new THREE.CylinderGeometry(.055, .055, .16, 24), M.beans, 0, .08, 0); part(g, new THREE.CylinderGeometry(.058, .058, .03, 24), M.oakLight, 0, .175, 0); }

/* ---------- 01 web desk ---------- */
rbox(2.9, .05, 1.1, .01, 2.15, 4.65, .72, M.oakLight);
box(.08, .72, .9, .8, 4.65, 0, M.oakLight); box(.08, .72, .9, 3.5, 4.65, 0, M.oakLight);
const webScreens = [];
// a real monitor: thin bezel, glowing panel, rear housing, neck and foot. Screen faces local +Z.
function monitor(x, y, rot, h0, ui, w = .62) {
  const g = group(x, y, rot, h0), hh = w * .58;
  part(g, new RoundedBoxGeometry(w, hh, .018, 3, .006), M.plastic, 0, .17 + hh / 2, 0);
  const scr = part(g, new THREE.PlaneGeometry(w - .02, hh - .03), ui, 0, .17 + hh / 2 + .006, .0095); scr.castShadow = false;
  part(g, new RoundedBoxGeometry(w * .5, hh * .55, .035, 3, .012), M.plastic, 0, .17 + hh / 2, -.02);
  part(g, new RoundedBoxGeometry(.045, .26, .022, 2, .008), M.steel, 0, .13, -.045);
  part(g, new RoundedBoxGeometry(.22, .012, .17, 2, .005), M.steel, 0, .006, -.03);
  return g;
}
function keyboard(x, y, rot, h0) {
  const g = group(x, y, rot, h0);
  part(g, new RoundedBoxGeometry(.38, .014, .125, 2, .005), M.white, 0, .007, 0);
  const k = part(g, new THREE.PlaneGeometry(.36, .105), M.keys, 0, .0145, 0); k.rotation.x = -Math.PI / 2;
  const ms = part(g, new THREE.SphereGeometry(.03, 20, 12), M.white, .27, .008, 0); ms.scale.set(.75, .3, 1.15);
}
function mug(x, y, h0, m = M.ceramic) { const g = group(x, y, 0, h0);
  part(g, new THREE.CylinderGeometry(.042, .04, .095, 24), m, 0, .048, 0);
  part(g, new THREE.CylinderGeometry(.036, .036, .002, 24), M.dark, 0, .09, 0);
  const hd = part(g, new THREE.TorusGeometry(.024, .007, 8, 16, Math.PI), m, .044, .05, 0); hd.rotation.z = -Math.PI / 2; }
for (const [x, y, back, ui] of [[1.5, 4.5, false, M.uiA], [2.6, 4.5, false, M.uiB], [1.5, 4.95, true, M.uiB], [2.6, 4.95, true, M.uiA]]) {
  const m = monitor(x, y, back ? Math.PI : 0, .745, ui); if (!back) webScreens.push(m);
  keyboard(x, y + (back ? .3 : -.3), back ? Math.PI : 0, .745);
}
mug(3.15, 4.35, .745); mug(.95, 5.0, .745);
{ const g = group(1.0, 4.35, .3, .745); part(g, new RoundedBoxGeometry(.15, .012, .21, 2, .004), M.dark, 0, .006, 0); part(g, new THREE.BoxGeometry(.004, .013, .21), M.lampShade, .07, .006, 0); }   // notebook
// lamp
cyl(.008, .008, .32, 2.05, 4.6, .745, M.lampShade, 8); cyl(.06, .06, .01, 2.05, 4.6, .745, M.lampShade);
const shade = new THREE.Mesh(new THREE.SphereGeometry(.11, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2), M.lampShade); shade.position.copy(P(2.05, 4.6, 1.07)); scene.add(shade);
const lampL = new THREE.PointLight(0xff9a4a, 2.2, 3.2, 2); lampL.position.copy(P(2.05, 4.6, 1.0)); scene.add(lampL);
// a real task chair: 5-star base with casters, gas lift, padded seat, curved backrest, armrests. Sitter faces local -Z.
function chair(x, y, rot, fabric = M.fabricOr) {
  const g = group(x, y, rot);
  for (let i = 0; i < 5; i++) { const a = i / 5 * Math.PI * 2 + .3, ax = Math.sin(a), az = Math.cos(a);
    const arm = part(g, new THREE.BoxGeometry(.032, .028, .3), M.plastic, ax * .15, .085, az * .15); arm.rotation.y = a; arm.rotation.x = .08;
    const wheel = part(g, new THREE.CylinderGeometry(.028, .028, .022, 16), M.plastic, ax * .3, .03, az * .3); wheel.rotation.set(Math.PI / 2, 0, 0); wheel.rotation.y = a;
    part(g, new THREE.CylinderGeometry(.008, .008, .04, 8), M.chrome, ax * .3, .065, az * .3); }
  part(g, new THREE.CylinderGeometry(.045, .05, .05, 20), M.plastic, 0, .1, 0);
  part(g, new THREE.CylinderGeometry(.028, .028, .19, 16), M.plastic, 0, .21, 0);
  part(g, new THREE.CylinderGeometry(.019, .019, .14, 16), M.chrome, 0, .36, 0);
  part(g, new RoundedBoxGeometry(.24, .05, .24, 2, .01), M.plastic, 0, .45, 0);
  part(g, new RoundedBoxGeometry(.5, .09, .48, 4, .04), fabric, 0, .52, 0);
  const spine = part(g, new RoundedBoxGeometry(.05, .36, .025, 2, .01), M.plastic, 0, .62, .25); spine.rotation.x = -.12;
  const back = part(g, bend(new RoundedBoxGeometry(.47, .5, .07, 4, .033), .45), fabric, 0, .9, .28); back.rotation.x = -.1;
  for (const s of [-1, 1]) { part(g, new RoundedBoxGeometry(.03, .2, .05, 2, .01), M.plastic, s * .27, .62, .04);
    part(g, new RoundedBoxGeometry(.065, .03, .26, 2, .012), M.plastic, s * .27, .73, .02); }
  return g;
}
chair(1.65, 3.85, 0); chair(2.75, 3.85, 0);

/* ---------- 02 3D: low round table by the windows ---------- */
cyl(.62, .62, .05, -1.95, 8.6, .4, M.white, 64); cyl(.32, .36, .4, -1.95, 8.6, 0, M.white, 48);
// solid oak stools: thick rounded seat, three splayed legs, footrest ring
for (const a of [.3, 2.4, 4.4]) { const g = group(-1.95 + Math.cos(a), 8.6 + Math.sin(a), a);
  part(g, new RoundedBoxGeometry(.34, .04, .34, 4, .018), M.oakLight, 0, .44, 0).geometry = new THREE.CylinderGeometry(.17, .165, .04, 40);
  for (let k = 0; k < 3; k++) { const b = k / 3 * Math.PI * 2; const l = part(g, new THREE.CylinderGeometry(.016, .02, .44, 10), M.oakLight, Math.cos(b) * .12, .22, Math.sin(b) * .12); l.rotation.set(-Math.sin(b) * .12, 0, Math.cos(b) * .12); }
  part(g, new THREE.TorusGeometry(.13, .007, 8, 36), M.oakLight, 0, .16, 0).rotation.x = Math.PI / 2; }

/* ---------- 03 software: glass office ---------- */
const fx = 4.5, y0 = 6.6, y1 = 12.2, d0 = 9.0, d1 = 9.8;
function glassPanel(w, x, y, rotY) { const g = new THREE.Mesh(new THREE.PlaneGeometry(w, H - .02), M.glass); g.position.copy(P(x, y, H / 2)); g.rotation.y = rotY; scene.add(g); }
glassPanel(d0 - y0, fx, (y0 + d0) / 2, Math.PI / 2); glassPanel(y1 - d1, fx, (d1 + y1) / 2, Math.PI / 2);
glassPanel(XR - fx, (fx + XR) / 2, y0, 0); glassPanel(XR - fx, (fx + XR) / 2, y1, 0);
const door = new THREE.Mesh(new THREE.PlaneGeometry(.8, 2.3), M.glass); door.position.copy(P(fx + .4, d1, 1.15)); scene.add(door);
for (const y of [y0, 7.8, d0, d1, 11.0, y1]) box(.035, H, .035, fx, y, 0, M.frame, false);
for (const x of [fx, 6.2, XR]) { box(.035, H, .035, x, y0, 0, M.frame, false); box(.035, H, .035, x, y1, 0, M.frame, false); }
box(.035, .035, y1 - y0, fx, (y0 + y1) / 2, H - .035, M.frame, false); box(.035, .035, y1 - y0, fx, (y0 + y1) / 2, 0, M.frame, false);
box(.035, .035, .8, fx + .4, d1, 2.3, M.frame, false);
rbox(.8, .04, 4.2, .01, 7.4, 9.4, .72, M.white); for (const y of [7.6, 8.8, 10.0, 11.2]) box(.7, .72, .04, 7.4, y, 0, M.white);
for (const y of [7.9, 8.6, 10.2, 10.9]) { monitor(7.62, y, -Math.PI / 2, .74, M.code, .6); keyboard(7.2, y, -Math.PI / 2, .74); }
// laptop, open, screen facing the chair
{ const g = group(7.25, 9.4, -Math.PI / 2, .74);
  part(g, new RoundedBoxGeometry(.32, .012, .22, 2, .005), M.steel, 0, .006, 0);
  const lid = new THREE.Group(); lid.position.set(0, .012, -.11); lid.rotation.x = -.28; g.add(lid);
  part(lid, new RoundedBoxGeometry(.32, .21, .008, 2, .004), M.steel, 0, .105, 0);
  const ls = part(lid, new THREE.PlaneGeometry(.29, .18), M.code, 0, .105, .0045); ls.castShadow = false; }
mug(7.5, 11.6, .74); mug(7.45, 7.2, .74, M.lampShade);
chair(6.7, 9.4, -Math.PI / 2, M.fabricBk); chair(6.85, 8.0, -Math.PI / 2 - .3, M.fabricBk); chair(6.85, 10.9, -Math.PI / 2 + .25, M.fabricBk);
const softL = new THREE.PointLight(0xffd2a8, 3, 5, 2); softL.position.copy(P(6.6, 9.4, 2.6)); scene.add(softL);
const codeGlow = new THREE.PointLight(0x9fb4ff, .6, 2.5, 2); codeGlow.position.copy(P(7.1, 9.4, 1.2)); scene.add(codeGlow);

/* ---------- 04 agent: platform under the orange spot ---------- */
cyl(1.35, 1.4, .18, 0, 16.2, 0, M.dark, 96);
cyl(1.3, 1.3, .1, 0, 16.2, H - .3, M.dark, 96);
const disk = new THREE.Mesh(new THREE.CircleGeometry(1.1, 64), new THREE.MeshBasicMaterial({ color: 0xffb070, toneMapped: false })); disk.rotation.x = Math.PI / 2; disk.position.copy(P(0, 16.2, H - .31)); scene.add(disk);
const spot = new THREE.SpotLight(0xff8a30, 120, 9, .55, .65, 1.6); spot.position.copy(P(0, 16.2, H - .32)); spot.target.position.copy(P(0, 16.2, 0)); spot.castShadow = true; spot.shadow.mapSize.set(1024, 1024); scene.add(spot, spot.target);
const wash = new THREE.SpotLight(0xff8a30, 45, 7, .5, .9, 1.4); wash.position.copy(P(0, 14.8, H - .2)); wash.target.position.copy(P(0, D, 1.5)); scene.add(wash, wash.target);

// Farol, the AI agent, floating over the platform (its own scene, drawn after the room and the 360° photo)
const farol = createFarol({ THREE, RoundedBoxGeometry, RoomEnvironment, renderer, at: P(0, 16.2, .18), scale: 1.5 });

/* ---------- plants ---------- */
// fiddle-leaf fig: broad violin-shaped leaves with veins, a few branches, matte ceramic pot with rim and soil
const figTex = canvasTex(256, 384, (g, w, h) => {
  g.translate(w / 2, h); g.beginPath(); g.moveTo(0, -6);
  g.bezierCurveTo(-120, -60, -128, -210, -70, -300); g.bezierCurveTo(-40, -350, -10, -378, 0, -380);
  g.bezierCurveTo(10, -378, 40, -350, 70, -300); g.bezierCurveTo(128, -210, 120, -60, 0, -6); g.closePath();
  const gr = g.createLinearGradient(-100, 0, 100, -380); gr.addColorStop(0, '#24451f'); gr.addColorStop(.5, '#36612b'); gr.addColorStop(1, '#2b5225');
  g.fillStyle = gr; g.fill(); g.strokeStyle = 'rgba(190,210,140,.55)'; g.lineWidth = 5; g.beginPath(); g.moveTo(0, -6); g.lineTo(0, -370); g.stroke();
  g.lineWidth = 2.2; for (let i = 1; i < 9; i++) { const yy = -30 - i * 38; for (const s of [-1, 1]) { g.beginPath(); g.moveTo(0, yy); g.quadraticCurveTo(s * 40, yy - 18, s * (70 - Math.abs(i - 4) * 6), yy - 46); g.stroke(); } }
});
M.fig = new THREE.MeshStandardMaterial({ map: figTex, alphaTest: .5, side: THREE.DoubleSide, roughness: .55, envMapIntensity: .6 });
function plant(x, y, s = 1) {
  const g = group(x, y, rnd() * 6);
  part(g, new THREE.CylinderGeometry(.25 * s, .19 * s, .5 * s, 40), M.pot, 0, .25 * s, 0);
  part(g, new THREE.TorusGeometry(.25 * s, .012, 8, 40), M.pot, 0, .5 * s, 0).rotation.x = Math.PI / 2;
  part(g, new THREE.CylinderGeometry(.24 * s, .24 * s, .01, 40), M.soil, 0, .47 * s, 0);
  const branches = 3;
  for (let b = 0; b < branches; b++) {
    const ba = b / branches * Math.PI * 2 + rnd(), tilt = .12 + rnd() * .12, len = (1.05 + rnd() * .5) * s;
    const br = new THREE.Group(); br.position.y = .47 * s; br.rotation.set(Math.cos(ba) * tilt, 0, Math.sin(ba) * tilt); g.add(br);
    part(br, new THREE.CylinderGeometry(.008, .014, len, 8), M.dark, 0, len / 2, 0);
    const n = 9 + Math.floor(rnd() * 4);
    for (let i = 0; i < n; i++) {
      const t = .3 + i / n * .7, a = i * 2.4 + rnd() * .6, ls = (.24 + rnd() * .1) * s * (1.1 - t * .3);
      const l = part(br, new THREE.PlaneGeometry(ls * .66, ls), M.fig, Math.cos(a) * .05, t * len, Math.sin(a) * .05);
      l.geometry.translate(0, ls / 2, 0); l.rotation.set(0, -a + Math.PI / 2, 0); l.rotateX(-.55 - rnd() * .5); l.rotateY((rnd() - .5) * .6);
    }
  }
}
plant(-2.05, 7.0); plant(-2.75, 13.6, .9); plant(-2.75, 15.3, .9); plant(7.3, 16.8, 1.05);

/* ---------- general light ---------- */
scene.add(new THREE.HemisphereLight(0xffe2c4, 0x2a1f16, .28));
const moon = new THREE.DirectionalLight(0x8fa6ff, .35); moon.position.set(-12, 6, -8); scene.add(moon);
for (const [x, y] of [[-1, 3], [2.8, 3], [-1, 8], [2, 8], [-1, 12.5], [2.2, 13]]) { const l = new THREE.PointLight(0xffd6a8, 3.2, 6, 2); l.position.copy(P(x, y, H - .25)); scene.add(l); }
const key = new THREE.DirectionalLight(0xffd8ad, .32); key.position.copy(P(4, 2, 6)); key.target.position.copy(P(1, 10, 0)); key.castShadow = true;
key.shadow.mapSize.set(2048, 2048); Object.assign(key.shadow.camera, { left: -10, right: 10, top: 12, bottom: -12, far: 30 }); key.shadow.bias = -.0004; scene.add(key, key.target);

/* ---------- stops: where the camera goes when you touch a zone ---------- */
const STOPS = [
  { n: '00', h: 'La sala', k: 'Entrada', pos: P(.4, .4, 1.6), look: P(.6, 12, 1.0) },
  { n: '01', h: 'Páginas web', k: 'Webs', pos: P(2.1, 2.55, 1.45), look: P(2.1, 4.6, 1.0) },
  { n: '02', h: 'Animaciones 3D', k: '3D', pos: P(.4, 8.6, 1.2), look: P(-1.95, 8.6, .75) },
  { n: '03', h: 'Desarrollo y software', k: 'Software', pos: P(5.4, 9.4, 1.5), look: P(8, 9.4, 1.0) },
  { n: '04', h: 'Agente IA', k: 'Agente', pos: P(.1, 11.5, 1.5), look: P(0, 16.2, .8) },
];
const HIT = [ // clickable objects in the room → zone
  { z: 1, min: P(.6, 5.4, 0), max: P(3.7, 3.9, 1.4) }, { z: 2, min: P(-2.9, 9.6, 0), max: P(-1, 7.6, .9) },
  { z: 3, min: P(4.4, 12.3, 0), max: P(8, 6.5, H) }, { z: 4, min: P(-1.5, 17.7, 0), max: P(1.5, 14.7, 2.6) }];
HIT.forEach(h => { h.box = new THREE.Box3(h.min.clone().min(h.max), h.min.clone().max(h.max)); });

/* ---------- camera: fly directly to a zone, drag to look around ---------- */
let cur = 0, fly = null, yaw = 0, pitch = 0, yawT = 0, pitchT = 0;
const camPos = STOPS[0].pos.clone(), camLook = STOPS[0].look.clone();
const ease = t => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
function go(i) {
  if (i === cur && !fly) return;
  const a = camPos.clone(), b = STOPS[i].pos.clone(), la = camLook.clone(), lb = STOPS[i].look.clone();
  // one curve over the open centre of the room, slightly raised, so the camera never cuts through furniture
  const mid = a.clone().lerp(b, .5); mid.x = THREE.MathUtils.lerp(mid.x, .6, .6); mid.y = Math.max(a.y, b.y) + .35;
  const dist = a.distanceTo(b);
  fly = { a, b, mid, la, lb, t: 0, dur: Math.min(2.4, Math.max(1.3, dist * .16)) };
  yaw = Math.atan2(Math.sin(yaw), Math.cos(yaw));   // after a full 360° look, return the short way
  cur = i; yawT = 0; pitchT = 0; ui(); ensurePano(i);   // start loading the destination's photo during the flight
}
const zoneEl = document.getElementById('zone'), nav = document.getElementById('sala-nav');
const btns = STOPS.map((s, i) => { const b = document.createElement('button'); b.innerHTML = `<b>${s.n}</b>${s.k}`; b.onclick = () => go(i); nav.appendChild(b); return b; });
document.querySelectorAll('.map .z').forEach(el => el.addEventListener('click', () => go(+el.dataset.z)));
function ui() { btns.forEach((b, k) => b.classList.toggle('on', k === cur)); zoneEl.classList.add('out'); }
function showZone() { document.getElementById('zn').textContent = STOPS[cur].n; document.getElementById('zh').textContent = STOPS[cur].h; zoneEl.classList.remove('out'); }
ui(); showZone();

const cv = renderer.domElement, ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
let drag = null;
cv.addEventListener('pointerdown', e => { drag = { x: e.clientX, y: e.clientY, yaw: yawT, pitch: pitchT, moved: 0 }; cv.setPointerCapture(e.pointerId); });
cv.addEventListener('pointermove', e => {
  if (drag) { const dx = e.clientX - drag.x, dy = e.clientY - drag.y; drag.moved = Math.max(drag.moved, Math.hypot(dx, dy)); const free = !!panoAt();   // inside a 360° photo: look all the way round
    yawT = free ? drag.yaw - dx * .004 : THREE.MathUtils.clamp(drag.yaw - dx * .004, -1.1, 1.1); pitchT = THREE.MathUtils.clamp(drag.pitch - dy * .003, free ? -1.1 : -.45, free ? 1.1 : .45); if (drag.moved > 4) cv.classList.add('drag'); return; }
  cv.classList.toggle('hot', hitZone(e) >= 0);
});
cv.addEventListener('pointerup', e => { const was = drag; drag = null; cv.classList.remove('drag'); if (was && was.moved < 5) { const z = hitZone(e); if (z >= 0) go(z); } });
function hitZone(e) { ndc.set(e.clientX / innerWidth * 2 - 1, -(e.clientY / innerHeight) * 2 + 1); ray.setFromCamera(ndc, cam); const p = new THREE.Vector3(); for (const h of HIT) if (ray.ray.intersectBox(h.box, p)) return h.z; return -1; }
let wheelLock = 0;
// one zone per scroll gesture: ignore the wheel while flying and until the gesture's inertia has died down
let wheelQuietUntil = 0;
const enSala = () => scrollY <= 4;
addEventListener('wheel', e => {
  const now = performance.now();
  if (!enSala()) { wheelQuietUntil = now + 220; return; }   // leyendo debajo: al volver arriba, la inercia no cambia de zona
  if (cur === STOPS.length - 1 && e.deltaY > 0 && !fly && now >= wheelLock && now >= wheelQuietUntil) return;   // al final de la sala, un gesto nuevo baja al texto
  e.preventDefault();
  if (fly || now < wheelLock) { wheelQuietUntil = now + 220; return; }   // still flying, or the same gesture is still sending events
  if (now < wheelQuietUntil) { wheelQuietUntil = now + 220; return; }
  if (Math.abs(e.deltaY) < 10) return;
  wheelLock = now + 400; go(Math.max(0, Math.min(STOPS.length - 1, cur + Math.sign(e.deltaY))));
}, { passive: false });
addEventListener('keydown', e => {
  if (!enSala() || (e.target.closest && e.target.closest('input, textarea, select, [contenteditable]'))) return;
  if (cur === STOPS.length - 1 && e.key === 'ArrowDown') return;   // al final, la flecha baja al texto
  if (['ArrowRight', 'ArrowDown'].includes(e.key)) { e.preventDefault(); go(Math.min(STOPS.length - 1, cur + 1)); }
  if (['ArrowLeft', 'ArrowUp'].includes(e.key)) { e.preventDefault(); go(Math.max(0, cur - 1)); } });

/* ---------- minimap ---------- */
const me = document.getElementById('me'), cone = document.getElementById('cone');
function map() {
  const x = camPos.x, y = -camPos.z, dx = camLook.x - camPos.x, dy = -(camLook.z - camPos.z);
  const a = Math.atan2(dy, dx) + yaw, r = 2.6, s = .45;
  me.setAttribute('cx', x); me.setAttribute('cy', y);
  cone.setAttribute('d', `M${x},${y} L${x + Math.cos(a - s) * r},${y + Math.sin(a - s) * r} L${x + Math.cos(a + s) * r},${y + Math.sin(a + s) * r} Z`);
}

const HF = 'https://d2ol7oe51mr4n9.cloudfront.net/user_3DRpbWuEuplaly3lxfOiPDXfuS9/';

/* ---------- 360° panoramas: a real photo around you at each zone ----------
   A sphere centred on the zone's camera point. Standing there you see only the photo (look all around);
   when you fly away it dissolves into the 3D room, and the 3D carries the flight. */
const BIG = renderer.capabilities.maxTextureSize >= 8192;   // 8K on desktops, 4K where the GPU can't hold 8K
const PANO_IDS = {   // [8K, 4K] per zone: photoreal faces stitched, every face checked against the 3D
  0: ['35f0d06a-deb6-435c-9e5b-ce6a21b7b2ab', 'bcbc926a-7a5f-43d2-9068-f1e85d0b8cc4'],
  1: ['83bf2481-c7ca-435b-8ac5-c2a103a2d5be', 'f8cd6b17-8423-4894-ad33-d9bc2f49a2d3'],
  2: ['abb23915-be4e-414c-84ea-2353351bab12', '7cf08680-34e3-459c-879c-4f834213d188'],
  3: ['63aa0551-8615-47a7-8cd8-1ed74607b709', 'd7d215ca-1234-4696-837c-5d63417c348a'],
  4: ['50bbf55b-b7f5-45a3-9e2b-f9368dc708e6', '5fef5f4c-9109-4ebd-8ff6-4c0a76a2ffc2'] };
const PANOS = Object.fromEntries(Object.entries(PANO_IDS).map(([z, v]) => [z, HF + (BIG ? v[0] : v[1]) + '.jpg']));
const panos = [];
const panoGeo = new THREE.SphereGeometry(40, 96, 48); panoGeo.scale(-1, 1, 1);
Object.entries(PANOS).forEach(([z, url]) => {
  const m = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthTest: false, depthWrite: false, toneMapped: false, fog: false });
  const s = new THREE.Mesh(panoGeo, m); s.renderOrder = 999; s.frustumCulled = false; s.visible = false;
  s.position.copy(STOPS[z].pos);
  // image centre (longitude 0) faces this zone's view direction
  const d = new THREE.Vector3().subVectors(STOPS[z].look, STOPS[z].pos); s.rotation.y = Math.atan2(d.z, -d.x);   // local -X is the image centre
  scene.add(s); panos.push({ z: +z, s, m, url, ready: false, loading: false });
});
// one 8K panorama is ~180 MB of GPU memory: load a zone's photo only when you go there, free the others once you've left
function ensurePano(z) {
  const p = panos.find(q => q.z === z); if (!p || p.ready || p.loading) return; p.loading = true;
  new THREE.TextureLoader().load(p.url, t => { t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = renderer.capabilities.getMaxAnisotropy();
    if (!p.loading) { t.dispose(); return; } p.m.map = t; p.m.needsUpdate = true; p.ready = true; p.loading = false; }, undefined, () => { p.loading = false; });
}
function releasePanos() {
  panos.forEach(p => { if (p.z === cur || p.m.opacity > .01) return;
    if (p.m.map) { p.m.map.dispose(); p.m.map = null; p.m.needsUpdate = true; } p.ready = false; p.loading = false; });
}
ensurePano(0);
const panoAt = () => panos.find(p => p.z === cur && p.ready && !fly);
function updatePanos(dt) {
  panos.forEach(p => {
    const d = cam.position.distanceTo(p.s.position);
    const target = p.ready ? 1 - THREE.MathUtils.smoothstep(d, .04, .9) : 0;
    p.m.opacity += (target - p.m.opacity) * (1 - Math.exp(-dt * 10));
    p.s.visible = p.m.opacity > .002;
  });
}

/* ---------- loop ---------- */
addEventListener('resize', () => { renderer.setSize(innerWidth, innerHeight); cam.aspect = innerWidth / innerHeight; cam.updateProjectionMatrix(); });
const clock = new THREE.Clock(); const look = new THREE.Vector3(), fwd = new THREE.Vector3(), up = new THREE.Vector3(0, 1, 0);
let breathe = 0;
let salaVisible = true;
new IntersectionObserver(es => { salaVisible = es[0].isIntersecting; }).observe(sala);
renderer.setAnimationLoop(() => {
  const dt = Math.min(.1, clock.getDelta()); if (!salaVisible || document.hidden) return; breathe += dt;
  if (fly) {
    fly.t = Math.min(1, fly.t + dt / fly.dur); const k = ease(fly.t), u = 1 - k;
    camPos.set(0, 0, 0).addScaledVector(fly.a, u * u).addScaledVector(fly.mid, 2 * u * k).addScaledVector(fly.b, k * k);
    camLook.lerpVectors(fly.la, fly.lb, ease(Math.min(1, fly.t * 1.15)));
    if (fly.t >= 1) { fly = null; showZone(); releasePanos(); }
  }
  if (!drag && !panoAt()) { yawT *= .985; pitchT *= .985; }       // the view slowly settles back (not inside a 360° photo)
  yaw += (yawT - yaw) * (1 - Math.exp(-dt * 8)); pitch += (pitchT - pitch) * (1 - Math.exp(-dt * 8));
  fwd.subVectors(camLook, camPos); const dist = fwd.length(); fwd.normalize();
  fwd.applyAxisAngle(up, yaw); const right = new THREE.Vector3().crossVectors(fwd, up).normalize(); fwd.applyAxisAngle(right, pitch);
  cam.position.copy(camPos); cam.position.y += Math.sin(breathe * 1.3) * .006;   // tiny hand-held breathing
  look.copy(cam.position).addScaledVector(fwd, dist); cam.lookAt(look);
  updatePanos(dt); map(); renderer.render(scene, cam); farol.render(cam, dt);
});
document.getElementById('load').style.opacity = 0; setTimeout(() => document.getElementById('load').remove(), 900);
window.__go = go; window.__lab = { THREE, scene, renderer, STOPS, panos, farol };
}   // sala3d
