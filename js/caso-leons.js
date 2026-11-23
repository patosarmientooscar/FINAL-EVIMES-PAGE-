/* ==========================================================================
   caso-leons.js — el caso de "Negocios locales" en #para-quien: la web de
   Leon's Peluqueros en un móvil 3D apoyado en un bloque de hormigón.
   · El móvil es el del bodegón aprobado (Downloads/evimes-cards/bodegones.html,
     el mismo que js/bento/bodegones.js): cuerpo de aluminio oscuro, cristal,
     reflejo, isla y la cámara de detrás. En la pantalla, una captura REAL del
     hero de patosarmientooscar.github.io/leon-s (assets/img/leons-hero.*).
   · Three.js 0.160.0 (la misma URL que el portátil, vía el import map) +
     RoundedBoxGeometry. Se crea la primera vez que el caso está en pantalla
     con su pestaña activa, en su turno (EV.gpu) y con compileAsync.
   · Pinta solo cuando hace falta: al cambiar de tamaño y con el giro de
     -6° → 0° que pone js/para-quien.js (EV.giroCaso) al cruzar la pantalla.
   · Movimiento reducido, ahorro de datos o sin WebGL: el móvil fijo en CSS con
     la misma captura (.pq-movil-fijo).
   ========================================================================== */
const EV = window.EV || {};
const THREE_URL = 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.min.js';
const RB_URL = 'https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/geometries/RoundedBoxGeometry.js';
const PANTALLA = 'assets/img/leons-hero.webp';
const G = EV.gpu || { cede: () => new Promise(r => setTimeout(r, 0)), turno: fn => Promise.resolve().then(fn), pmrem: null };

const raiz = document.querySelector('[data-leons-escena]');
const quieto = EV.mode !== 'cine' || !!(navigator.connection && navigator.connection.saveData);
if (raiz && !quieto) iniciar();

function iniciar() {
  const panel = raiz.closest('[role="tabpanel"]');
  let creada = false, visible = false, api = null;
  const activo = () => !panel || !panel.hidden;
  const mirar = () => {
    if (visible && activo() && !creada) {
      creada = true;
      crear().then(a => { api = a; api.visible(visible && activo()); }).catch(err => { console.warn('[caso Leon\'s] sin 3D, móvil fijo', err); });
    }
    if (api) api.visible(visible && activo());
  };
  new IntersectionObserver(es => { visible = es[0].isIntersecting; mirar(); }, { rootMargin: '50% 0px' }).observe(raiz);
  // la pestaña: js/para-quien.js quita y pone [hidden] en el panel
  if (panel) new MutationObserver(mirar).observe(panel, { attributes: true, attributeFilter: ['hidden'] });
}

async function crear() {
  const img = new Image(); img.src = PANTALLA;
  const [THREE, { RoundedBoxGeometry }] = await Promise.all([import(THREE_URL), import(RB_URL), img.decode()]);
  return G.turno(() => montar(THREE, RoundedBoxGeometry, img), 0);
}

async function montar(THREE, RoundedBoxGeometry, img) {
  const cv = raiz.querySelector('canvas');
  const renderer = new THREE.WebGLRenderer({ canvas: cv, antialias: true, powerPreference: 'high-performance' });
  renderer.debug.checkShaderErrors = false;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setClearColor(0x141518, 1);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  await G.cede();

  const scene = new THREE.Scene();
  scene.environment = await entorno(THREE, renderer);
  await G.cede();

  const raizG = new THREE.Group(); scene.add(raizG);

  /* ---------- el bloque de hormigón (el del bodegón, más oscuro: la tarjeta es negra) ---------- */
  const map = hormigon(THREE, 46);
  const bloque = new THREE.Mesh(new RoundedBoxGeometry(1.7, .62, 1.35, 3, .012),
    new THREE.MeshStandardMaterial({ map, bumpMap: map, bumpScale: .6, roughness: .9, envMapIntensity: .35 }));
  bloque.position.y = .31; bloque.rotation.y = -.5; bloque.castShadow = bloque.receiveShadow = true;
  raizG.add(bloque);

  /* ---------- el móvil del bodegón, tal cual ---------- */
  const phone = new THREE.Group();
  const W = .78, H = 1.6, D = .07;
  const body = new THREE.Mesh(new RoundedBoxGeometry(W, H, D, 6, .1), new THREE.MeshStandardMaterial({ color: 0x202125, metalness: .85, roughness: .32, envMapIntensity: 1 }));
  body.receiveShadow = true; phone.add(body);
  const glass = new THREE.Mesh(new THREE.PlaneGeometry(W - .035, H - .035), new THREE.MeshPhysicalMaterial({ color: 0x050506, roughness: .08, metalness: 0, clearcoat: 1, clearcoatRoughness: .05, envMapIntensity: 1.1 }));
  glass.position.z = D / 2 + .0006; phone.add(glass);
  const tex = new THREE.Texture(img);
  tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy()); tex.needsUpdate = true;
  const scr = new THREE.Mesh(new THREE.PlaneGeometry(W - .07, H - .07), new THREE.MeshBasicMaterial({ map: tex, toneMapped: false }));
  scr.material.color.setScalar(.92); scr.position.z = D / 2 + .0012; phone.add(scr);
  const sheen = new THREE.Mesh(new THREE.PlaneGeometry(W - .07, H - .07), new THREE.MeshPhysicalMaterial({ transparent: true, opacity: .18, roughness: .1, metalness: 1, color: 0xffffff, envMapIntensity: 1, depthWrite: false }));
  sheen.position.z = D / 2 + .0018; phone.add(sheen);
  const island = new THREE.Mesh(new RoundedBoxGeometry(.2, .055, .004, 2, .026), new THREE.MeshBasicMaterial({ color: 0x000000 }));
  island.position.set(0, H / 2 - .085, D / 2 + .003); phone.add(island);
  const bump = new THREE.Mesh(new RoundedBoxGeometry(.3, .3, .03, 3, .06), body.material);
  bump.position.set(-.2, H / 2 - .24, -D / 2 - .012); phone.add(bump);
  phone.rotation.x = -Math.PI / 2; phone.rotation.z = -.42; phone.position.set(.08, .62 + D / 2 + .001, .05);
  phone.traverse(o => { if (o.isMesh && o !== scr && o !== sheen && o !== glass) o.castShadow = true; });
  raizG.add(phone);

  // la pantalla tiñe un poco el hormigón (el dorado de Leon's), muy suave
  const brillo = new THREE.PointLight(0xc9a25a, .35, 1.6, 2);
  brillo.position.set(.08, 1.05, .05); raizG.add(brillo);

  /* ---------- la luz del bodegón ---------- */
  scene.add(new THREE.HemisphereLight(0xdfe3ea, 0x0b0c0f, .22));
  const key = new THREE.DirectionalLight(0xfff3e6, 2.6); key.position.set(-3, 5.5, 2.2); key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048);
  Object.assign(key.shadow.camera, { left: -3, right: 3, top: 3, bottom: -3, near: 1, far: 16 });
  key.shadow.radius = 4; key.shadow.bias = -.0004; key.shadow.normalBias = .02;
  const rim = new THREE.DirectionalLight(0xcfe0ff, .55); rim.position.set(4, 2.5, -4);
  scene.add(key, rim);

  /* ---------- la cámara del bodegón (encuadre ajustado a la tarjeta) ---------- */
  const camera = new THREE.PerspectiveCamera(24, 16 / 11, .1, 60);
  const sujeto = new THREE.Vector3(.05, .55, .1), dir = new THREE.Vector3(-.4, .8, .62).normalize();

  let sucio = true, visible = false, giro = 0;
  const pintar = () => { renderer.render(scene, camera); sucio = false; };
  const medir = () => {
    const w = Math.max(1, raiz.clientWidth), h = Math.max(1, raiz.clientHeight);
    renderer.setSize(w, h, false); camera.aspect = w / h;
    camera.fov = w / h < 1.3 ? 27 : 24;
    camera.position.copy(sujeto).addScaledVector(dir, w / h < 1.3 ? 4.6 : 4.2); camera.lookAt(sujeto);
    camera.updateProjectionMatrix();
    sucio = true;
  };
  new ResizeObserver(() => { medir(); if (visible) pintar(); }).observe(raiz);
  medir();

  await G.cede();
  renderer.initTexture(tex); renderer.initTexture(map);
  await G.cede();
  await renderer.compileAsync(scene, camera);
  await G.cede();
  pintar();
  raiz.classList.add('is-viva');

  const paso = () => {
    if (!visible) return;
    const g = EV.giroCaso || 0;                           // js/para-quien.js: -6° → 0° al cruzar la pantalla
    if (Math.abs(g - giro) > 1e-5) { giro = g; raizG.rotation.y = giro; sucio = true; }
    if (sucio) pintar();
  };
  if (window.gsap) gsap.ticker.add(paso);
  else { const f = () => { requestAnimationFrame(f); paso(); }; requestAnimationFrame(f); }

  return { visible: v => { visible = v; if (v) sucio = true; } };
}

/* Estudio oscuro (PMREM): una ventana suave arriba a la izquierda y una franja fría. */
function entorno(THREE, renderer) {
  const c = document.createElement('canvas'); c.width = 1024; c.height = 512; const g = c.getContext('2d');
  const bg = g.createLinearGradient(0, 0, 0, 512); bg.addColorStop(0, '#16171b'); bg.addColorStop(.55, '#08090b'); bg.addColorStop(1, '#030303');
  g.fillStyle = bg; g.fillRect(0, 0, 1024, 512);
  g.filter = 'blur(14px)';
  const mancha = (x, y, rx, ry, col) => { g.fillStyle = col; g.beginPath(); g.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2); g.fill(); };
  mancha(250, 90, 210, 70, 'rgba(255,248,236,.85)');
  mancha(760, 190, 140, 22, 'rgba(170,195,255,.16)');
  mancha(520, 300, 380, 18, 'rgba(255,255,255,.08)');
  const t = new THREE.CanvasTexture(c); t.mapping = THREE.EquirectangularReflectionMapping; t.colorSpace = THREE.SRGBColorSpace;
  if (G.pmrem) return G.pmrem(THREE, renderer, t).then(env => { t.dispose(); return env; });
  const pm = new THREE.PMREMGenerator(renderer); const env = pm.fromEquirectangular(t).texture; t.dispose(); pm.dispose();
  return Promise.resolve(env);
}

/* El hormigón del bodegón (concreteTex de js/bento/bodegones.js), con la misma semilla. */
function hormigon(THREE, base) {
  let seed = 7;
  const r = () => ((seed = Math.imul(seed ^ seed >>> 15, seed | 1) ^ (seed + Math.imul(seed ^ seed >>> 7, seed | 61))) >>> 0) / 4294967296;
  const N = 512, c = document.createElement('canvas'); c.width = c.height = N; const g = c.getContext('2d');
  const s = document.createElement('canvas'); s.width = s.height = 48; const sg = s.getContext('2d');
  for (let y = 0; y < 48; y++) for (let x = 0; x < 48; x++) { const v = base + (r() - .5) * 12; sg.fillStyle = `rgb(${v},${v},${v + 1})`; sg.fillRect(x, y, 1, 1); }
  g.imageSmoothingEnabled = true; g.drawImage(s, 0, 0, N, N);
  const id = g.getImageData(0, 0, N, N), d = id.data;
  for (let i = 0; i < d.length; i += 4) { const n = (r() - .5) * 14; d[i] += n; d[i + 1] += n; d[i + 2] += n; }
  g.putImageData(id, 0, 0);
  for (let i = 0; i < 900; i++) { const x = r() * N, y = r() * N, rad = r() * 1.8 + .4; g.fillStyle = `rgba(0,0,0,${.25 + r() * .4})`; g.beginPath(); g.arc(x, y, rad, 0, 7); g.fill(); }
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(1.6, 1.6); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
  return t;
}
