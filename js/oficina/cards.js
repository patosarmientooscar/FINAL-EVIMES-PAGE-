/* ==========================================================================
   oficina/cards.js — las cards de proyectos (lenguaje del bento: navy,
   hairline, filo de cromo): drawCard (canvas 1024×1280), geometrías (cara,
   filo, losa, halo), layout de inicio (miniaturas en la pantalla) y de fin
   (arco encima del monitor; 2×2 en móvil) y el raycaster del hover.
   Copiado tal cual del prototipo aprobado (evimes-oficina/index.html).
   ========================================================================== */
import { THREE } from './scene.js';
import { PROJECTS } from './config.js';

/* ---------------- the project cards (bento language: navy, hairline, chrome edge) ---------------- */
export const CW = 1024, CH = 1280;
const rr = (g, x, y, w, h, r) => { g.beginPath(); g.roundRect(x, y, w, h, r); };
export function drawCard(p, i, img) {
  const c = document.createElement('canvas'); c.width = CW; c.height = CH; const g = c.getContext('2d');
  rr(g, 0, 0, CW, CH, 72); g.save(); g.clip();
  const bg = g.createLinearGradient(0, 0, 0, CH); bg.addColorStop(0, '#0c1326'); bg.addColorStop(1, '#070a13'); g.fillStyle = bg; g.fillRect(0, 0, CW, CH);
  const gl = g.createRadialGradient(CW * .5, CH * .1, 10, CW * .5, CH * .1, CW * .9); gl.addColorStop(0, 'rgba(43,77,255,.35)'); gl.addColorStop(1, 'rgba(43,77,255,0)'); g.fillStyle = gl; g.fillRect(0, 0, CW, CH);
  // image window
  const ix = 44, iy = 44, iw = CW - 88, ih = Math.round(iw * 10 / 16);
  g.save(); rr(g, ix, iy, iw, ih, 40); g.clip();
  if (p.soon) { const a = g.createLinearGradient(ix, iy, ix + iw, iy + ih); const s = p.hue ? ['#123b56', '#00b8d4', '#2b4dff'] : ['#1c2d6b', '#8b5cf6', '#00e5ff'];
    a.addColorStop(0, s[0]); a.addColorStop(.55, s[1]); a.addColorStop(1, s[2]); g.fillStyle = a; g.fillRect(ix, iy, iw, ih);
    g.filter = 'blur(38px)'; g.fillStyle = 'rgba(255,255,255,.35)'; g.beginPath(); g.arc(ix + iw * .3, iy + ih * .4, 140, 0, 7); g.fill(); g.fillStyle = 'rgba(7,10,19,.45)'; g.beginPath(); g.arc(ix + iw * .75, iy + ih * .7, 180, 0, 7); g.fill(); g.filter = 'none';
    // a ghost of a page under frosted glass
    g.fillStyle = 'rgba(255,255,255,.22)'; rr(g, ix + 70, iy + 90, 380, 34, 17); g.fill(); rr(g, ix + 70, iy + 140, 300, 34, 17); g.fill(); rr(g, ix + 70, iy + 230, 170, 52, 26); g.fill();
    g.fillStyle = 'rgba(7,10,19,.25)'; g.fillRect(ix, iy, iw, ih);
    g.font = '600 30px "Schibsted Grotesk"'; g.fillStyle = 'rgba(236,231,221,.95)'; g.textAlign = 'center'; g.letterSpacing = '6px'; g.fillText('EN EL HORNO', ix + iw / 2, iy + ih / 2 + 10); g.textAlign = 'left'; g.letterSpacing = '0px';
  } else if (img) { const s = Math.max(iw / img.width, ih / img.height); g.drawImage(img, ix + (iw - img.width * s) / 2, iy, img.width * s, img.height * s); }
  else { g.fillStyle = '#10182f'; g.fillRect(ix, iy, iw, ih); }
  g.restore();
  g.strokeStyle = 'rgba(255,255,255,.14)'; g.lineWidth = 2; rr(g, ix, iy, iw, ih, 40); g.stroke();
  // copy
  g.fillStyle = 'rgba(236,231,221,.5)'; g.font = '500 26px "Schibsted Grotesk"'; g.letterSpacing = '5px'; g.fillText(String(i + 1).padStart(2, '0') + '  /  ' + String(PROJECTS.length).padStart(2, '0'), 60, ih + 140); g.letterSpacing = '0px';
  g.fillStyle = '#ece7dd'; g.font = '620 84px "Fraunces"'; const fit = (t, max) => { let s = 84; while (g.measureText(t).width > max && s > 40) { s -= 2; g.font = `620 ${s}px "Fraunces"`; } }; fit(p.title, CW - 120); g.fillText(p.title, 60, ih + 245);
  g.fillStyle = 'rgba(236,231,221,.66)'; g.font = '400 34px "Schibsted Grotesk"'; g.fillText(p.sub, 60, ih + 305);
  if (!p.soon) { g.fillStyle = 'rgba(255,255,255,.07)'; rr(g, 60, CH - 150, 250, 82, 41); g.fill(); g.strokeStyle = 'rgba(255,255,255,.18)'; g.lineWidth = 2; g.stroke();
    g.fillStyle = '#ece7dd'; g.font = '500 32px "Schibsted Grotesk"'; g.fillText('Ver web  →', 96, CH - 97); }
  else { g.fillStyle = 'rgba(0,229,255,.9)'; g.beginPath(); g.arc(74, CH - 110, 9, 0, 7); g.fill(); g.fillStyle = 'rgba(236,231,221,.6)'; g.font = '400 30px "Schibsted Grotesk"'; g.fillText('Muy pronto aquí', 98, CH - 100); }
  g.restore();
  // hairline like the bento cards
  g.strokeStyle = 'rgba(255,255,255,.10)'; g.lineWidth = 3; rr(g, 1.5, 1.5, CW - 3, CH - 3, 71); g.stroke();
  return c;
}
export const roundedRect = (w, h, r) => { const s = new THREE.Shape(), x = -w / 2, y = -h / 2; s.moveTo(x + r, y); s.lineTo(x + w - r, y); s.quadraticCurveTo(x + w, y, x + w, y + r); s.lineTo(x + w, y + h - r);
  s.quadraticCurveTo(x + w, y + h, x + w - r, y + h); s.lineTo(x + r, y + h); s.quadraticCurveTo(x, y + h, x, y + h - r); s.lineTo(x, y + r); s.quadraticCurveTo(x, y, x + r, y); return s; };
export const cardW = 1, cardH = 1.25;

export function crearCards(E) {
  const { scene } = E, { mR, mU, mN, mC, mW, mH } = E.mon;
  const shape = roundedRect(cardW, cardH, .07);
  const faceGeo = new THREE.ShapeGeometry(shape, 24); { const uv = faceGeo.attributes.uv, pos = faceGeo.attributes.position; for (let k = 0; k < uv.count; k++)uv.setXY(k, pos.getX(k) / cardW + .5, pos.getY(k) / cardH + .5); }
  const edgeGeo = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(shape.getPoints(28).map(p => new THREE.Vector3(p.x, p.y, 0)), true), 320, .0075, 8, true);
  const slabGeo = new THREE.ExtrudeGeometry(roundedRect(cardW * 1.0, cardH * 1.0, .07), { depth: .02, bevelEnabled: true, bevelThickness: .008, bevelSize: .006, bevelSegments: 3, curveSegments: 20 }); slabGeo.translate(0, 0, -.03);
  const chrome = new THREE.MeshPhysicalMaterial({ color: 0xe4e9f0, metalness: 1, roughness: .1, clearcoat: .9, envMapIntensity: 1.6 });
  const glowMat = (col) => new THREE.ShaderMaterial({ uniforms: { uA: { value: 0 }, uC: { value: new THREE.Color(col) } }, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    vertexShader: `varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
    fragmentShader: `varying vec2 vUv;uniform float uA;uniform vec3 uC;void main(){vec2 p=(vUv-.5)*vec2(1.,1.25);float r=length(p);gl_FragColor=vec4(uC*exp(-r*r*7.)*uA,1.);}` });
  const imgs = [];
  const cards = PROJECTS.map((p, i) => {
    const tex = new THREE.CanvasTexture(drawCard(p, i, null)); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 8;
    const face = new THREE.Mesh(faceGeo, new THREE.MeshBasicMaterial({ map: tex, toneMapped: false, transparent: true })); face.position.z = .002;
    const slab = new THREE.Mesh(slabGeo, new THREE.MeshPhysicalMaterial({ color: 0x0b1226, metalness: .2, roughness: .25, clearcoat: 1, envMapIntensity: .8, transparent: true }));
    const edge = new THREE.Mesh(edgeGeo, chrome.clone()); edge.material.transparent = true;
    const glow = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 3), glowMat(i % 2 ? 0x00b8d4 : 0x2b4dff)); glow.position.z = -.08;
    const g = new THREE.Group(); g.add(glow, slab, face, edge); g.renderOrder = 10 + i; scene.add(g);
    const c = { p, g, face, slab, edge, glow, tex, i, hover: 0, thover: 0 }; face.userData.card = c;
    const redraw = (img) => { tex.image = drawCard(p, i, img); tex.needsUpdate = true; };
    document.fonts.ready.then(() => redraw(null));
    if (p.img) imgs.push(new Promise(res => { const im = new Image(); im.crossOrigin = 'anonymous'; im.onload = () => document.fonts.ready.then(() => { c.img = im; redraw(im); res(); }); im.onerror = res; im.src = p.img; }));
    return c; });

  /* card start (thumbnail on the screen) and end (arc above the monitor), in monitor space */
  const tmpM = new THREE.Matrix4(), qMon = new THREE.Quaternion().setFromRotationMatrix(tmpM.makeBasis(mR, mU, mN));
  // ar: ancho/alto de la ventana. En móviles más estrechos que 0,49 el 2×2 del prototipo
  // se salía ~2 px por la izquierda (a 390×844): se escala para que quepa entero.
  function layout(mobile, ar = 1) {
    const n = cards.length;
    return cards.map((c, i) => {
      // thumbnails: a tidy row on the screen
      const tw = mW * .19, gap = mW * .035, row = n * tw + (n - 1) * gap;
      const s0 = tw / cardW; const x0 = -row / 2 + tw / 2 + i * (tw + gap);
      const start = { pos: mC.clone().addScaledVector(mR, x0).addScaledVector(mN, .012), s: s0, ry: 0, rz: 0 };
      let ex, ey, ez, ry, rz, s1;
      if (!mobile) { const k = i - (n - 1) / 2; s1 = mW * .33; ex = k * s1 * 1.08; ey = mH * .5 + s1 * cardH * .52 - Math.abs(k) * s1 * .06; ez = 1.35 + (1.5 - Math.abs(k)) * .12; ry = -k * .16; rz = -k * .025; }
      else { const cx = i % 2 ? .5 : -.5, cy = i < 2 ? 1 : 0; s1 = mW * .47 * Math.min(1, ar / .49); ex = cx * s1 * 1.06; ey = mH * .5 + s1 * cardH * (.52 + cy * 1.04); ez = 1.2; ry = -cx * .18; rz = 0; }
      const end = { pos: mC.clone().addScaledVector(mR, ex).addScaledVector(mU, ey).addScaledVector(mN, ez), s: s1, ry, rz };
      return { start, end }; });
  }

  // hover: el rayo del puntero contra las caras de las cards
  const ray = new THREE.Raycaster(), ptr = new THREE.Vector2(-9, -9);
  const tocada = camera => { ray.setFromCamera(ptr, camera); const hits = ray.intersectObjects(cards.map(c => c.face)); return hits.length ? hits[0].object.userData.card : null; };

  return { cards, layout, qMon, ptr, tocada, imgsListas: Promise.all(imgs) };
}
