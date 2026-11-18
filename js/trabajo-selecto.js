/* ==========================================================================
   trabajo-selecto.js — "Trabajo selecto" (home, en negro): la web de Disco
   en la pantalla de un portátil 3D apoyado sobre un bloque de hormigón.
   · Three.js 0.160.0 (la MISMA URL que la onda y el bento, vía el import map
     de index.html) + RoundedBoxGeometry. Se importa y se crea el renderer
     cuando la sección entra en pantalla (IntersectionObserver); fuera de
     pantalla no se pinta. pixelRatio ≤ 2.
   · Pinta solo cuando hace falta (bajo demanda): el único movimiento es un
     parallax de ±3° con el ratón; quieto, no se repinta.
   · Arranque escalonado (js/escenas.js → EV.gpu): se crea a menos de un
     viewport, en su turno, troceado (cediendo el hilo entre pasos), con la
     imagen decodificada antes de subirla y los shaders compilados en paralelo
     (compileAsync); la escena se funde sobre la captura cuando está lista.
   · Movimiento reducido, ahorro de datos o sin WebGL: la captura fija
     assets/img/trabajo-portatil.jpg (se rehace con ?ts=captura →
     window.__tsCaptura()).
   · Los datos de PageSpeed salen de js/data/pagespeed.js (reales).
   ========================================================================== */
const EV = window.EV || {};
const THREE_URL = 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.min.js';
const RB_URL = 'https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/geometries/RoundedBoxGeometry.js';
const HERO = 'assets/img/disco-hero.jpg';
const GRADO = Math.PI / 180;
const G = (window.EV && window.EV.gpu) || { cede: () => new Promise(r => setTimeout(r, 0)), turno: fn => Promise.resolve().then(fn), pmrem: null };

const raiz = document.querySelector('[data-ts-escena]');
const captura = new URLSearchParams(location.search).get('ts') === 'captura';

datosPSI();
if (raiz) iniciar();

/* Los 4 datos reales (el HTML ya los lleva; aquí se toman de la misma fuente). */
function datosPSI() {
  const D = window.EVIMES_PAGESPEED, ul = document.querySelector('[data-ts-psi]');
  if (!D || !ul) return;
  ul.querySelectorAll('[data-k]').forEach(li => {
    const v = D[li.dataset.k];
    if (typeof v !== 'number') return;
    li.querySelector('b').textContent = v;
    li.querySelector('.ts-psi__arco').style.setProperty('--v', v);
  });
}

function iniciar() {
  // Sin sonda de WebGL (un contexto de prueba costaba): si el renderer no se puede crear, se queda la captura fija (con alt).
  if (!captura && EV.mode === 'still') return;
  let creada = false, visible = false, api = null;
  new IntersectionObserver(es => {
    visible = es[0].isIntersecting;
    if (api) api.visible(visible);
    if (visible && !creada) {
      creada = true;
      crear().then(a => { api = a; api.visible(visible); }).catch(err => { console.warn('[trabajo selecto] sin 3D, captura fija', err); });
    }
  }, { rootMargin: '100% 0px' }).observe(raiz);   // a menos de un viewport
}

async function crear() {
  // Red y decodificación fuera del turno: Three.js, RoundedBoxGeometry y el hero de Disco (img.decode, fuera del hilo).
  const heroImg = new Image(); heroImg.src = HERO;
  const [THREE, { RoundedBoxGeometry }] = await Promise.all([import(THREE_URL), import(RB_URL), heroImg.decode()]);
  return G.turno(() => montar(THREE, RoundedBoxGeometry, heroImg), 0);
}

async function montar(THREE, RoundedBoxGeometry, heroImg) {
  const cv = raiz.querySelector('canvas'), img = raiz.querySelector('img');
  const renderer = new THREE.WebGLRenderer({ canvas: cv, antialias: true, powerPreference: 'high-performance', preserveDrawingBuffer: captura });
  renderer.debug.checkShaderErrors = false;      // producción: sin esperas síncronas en el primer uso de cada programa
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setClearColor(0x141518, 1);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  await G.cede();
  const scene = new THREE.Scene();
  scene.environment = await entornoOscuro(THREE, renderer);
  await G.cede();
  const camera = new THREE.PerspectiveCamera(28, 16 / 11, 0.1, 60);
  // cámara baja, en tres cuartos: mira el portátil desde la izquierda hacia la derecha
  camera.position.set(-4.3, 0.95, 4.6);
  const mira = new THREE.Vector3(0.5, 0.55, -0.1);
  camera.lookAt(mira);

  const raizG = new THREE.Group(); scene.add(raizG);

  /* ---------- bloque de hormigón oscuro, poroso ---------- */
  const tex = ruidoHormigon(THREE, renderer);
  await G.cede();
  const hormigon = new THREE.MeshStandardMaterial({ color: 0x2a2a2b, roughness: 0.94, roughnessMap: tex, bumpMap: tex, bumpScale: 2.2, envMapIntensity: 0.35 });
  const bloque = new THREE.Mesh(new RoundedBoxGeometry(3.4, 1.1, 2.5, 4, 0.035), hormigon);
  bloque.position.y = -0.55; bloque.receiveShadow = true; bloque.castShadow = true;
  raizG.add(bloque);

  /* ---------- el portátil: aluminio negro, sin logo ni marca ---------- */
  const alu = new THREE.MeshPhysicalMaterial({ color: 0x141518, metalness: 0.78, roughness: 0.46, clearcoat: 0.3, clearcoatRoughness: 0.45, envMapIntensity: 0.9 });
  const negroBrillo = new THREE.MeshStandardMaterial({ color: 0x060607, metalness: 0.2, roughness: 0.22, envMapIntensity: 0.8 });
  const teclado = new THREE.MeshStandardMaterial({ color: 0x08090a, roughness: 0.92, metalness: 0.05, envMapIntensity: 0.2 });
  const tactil = new THREE.MeshStandardMaterial({ color: 0x17181b, roughness: 0.38, metalness: 0.45, envMapIntensity: 0.5 });
  const BW = 2.6, BD = 1.8, BH = 0.07, LH = 1.7, LT = 0.045;

  const portatil = new THREE.Group();
  const base = new THREE.Mesh(new RoundedBoxGeometry(BW, BH, BD, 4, 0.03), alu);
  base.position.y = BH / 2; base.castShadow = true; base.receiveShadow = true;
  portatil.add(base);
  // teclado insinuado (un plano oscuro) y el panel táctil
  const kb = new THREE.Mesh(new THREE.PlaneGeometry(BW * 0.86, BD * 0.44), teclado);
  kb.rotation.x = -Math.PI / 2; kb.position.set(0, BH + 0.0015, -BD * 0.12); kb.receiveShadow = true;
  const tp = new THREE.Mesh(new THREE.PlaneGeometry(BW * 0.34, BD * 0.27), tactil);
  tp.rotation.x = -Math.PI / 2; tp.position.set(0, BH + 0.0015, BD * 0.3); tp.receiveShadow = true;
  portatil.add(kb, tp);

  // la tapa gira sobre la bisagra (borde trasero de la base): abierta a ~105°
  const bisagra = new THREE.Group();
  bisagra.position.set(0, BH, -BD / 2 + 0.02);
  bisagra.rotation.x = -15 * GRADO;
  const tapa = new THREE.Mesh(new RoundedBoxGeometry(BW, LH, LT, 4, 0.025), alu);
  tapa.position.set(0, LH / 2, -LT / 2); tapa.castShadow = true;
  // bisel negro fino + pantalla (hero de Disco, luminoso: MeshBasicMaterial sin tone mapping) + notch
  const SW = BW - 0.11, SH = SW / 1.6;
  const bisel = new THREE.Mesh(new THREE.PlaneGeometry(BW - 0.03, LH - 0.03), negroBrillo);
  bisel.position.set(0, LH / 2, 0.0006);
  const pantallaMat = new THREE.MeshBasicMaterial({ color: 0xffffff, toneMapped: false });
  const pantalla = new THREE.Mesh(new THREE.PlaneGeometry(SW, SH), pantallaMat);
  const yPantalla = LH / 2 + (LH - SH) / 2 - 0.07;   // más bisel abajo, como un portátil de verdad
  pantalla.position.set(0, yPantalla, 0.0012);
  const notch = new THREE.Mesh(new RoundedBoxGeometry(0.24, 0.07, 0.004, 2, 0.012), negroBrillo);
  notch.position.set(0, yPantalla + SH / 2 - 0.022, 0.0016);
  bisagra.add(tapa, bisel, pantalla, notch);
  portatil.add(bisagra);
  // medio fuera del borde del bloque (sobresale por la esquina delantera derecha)
  portatil.position.set(0.78, 0, 0.42);
  portatil.rotation.y = -0.2;
  raizG.add(portatil);

  // la luz de la pantalla tiñe un poco el teclado (el naranja de Disco), muy suave
  const brillo = new THREE.PointLight(0xff6a2a, 0.5, 2.6, 2);
  brillo.position.set(0.78, 0.9, 0.15); raizG.add(brillo);

  /* ---------- luz de estudio oscura ---------- */
  const clave = new THREE.DirectionalLight(0xfff6ec, 2.3);   // principal suave, arriba a la izquierda
  clave.position.set(-3.6, 5.6, 2.8); clave.castShadow = true;
  clave.shadow.mapSize.set(2048, 2048); clave.shadow.radius = 6; clave.shadow.bias = -0.0004; clave.shadow.normalBias = 0.02;
  Object.assign(clave.shadow.camera, { left: -3, right: 3, top: 3, bottom: -3, near: 1, far: 16 });
  const rim = new THREE.DirectionalLight(0xc6d4ff, 0.38);   // contraluz frío, muy sutil
  rim.position.set(3.8, 2.4, -3.8);
  scene.add(clave, rim, new THREE.HemisphereLight(0x1b1d22, 0x050505, 0.35));

  /* ---------- tamaño, pintado bajo demanda y parallax ---------- */
  let sucio = true, visible = false, tx = 0, ty = 0, rx = 0, ry = 0;
  const pintar = () => { renderer.render(scene, camera); sucio = false; };
  const medir = () => {
    const w = Math.max(1, raiz.clientWidth), h = Math.max(1, raiz.clientHeight);
    renderer.setSize(w, h, false); camera.aspect = w / h;
    // encuadre: en tarjetas más estrechas (móvil) la cámara se aleja un poco
    camera.fov = w / h < 1.3 ? 30 : 25.5; camera.updateProjectionMatrix(); camera.lookAt(mira);
    sucio = true;
  };
  new ResizeObserver(() => { medir(); if (visible) pintar(); }).observe(raiz);
  medir();

  // la pantalla: el hero ya decodificado; se sube a la GPU en su tarea y los shaders se compilan en paralelo
  const t = new THREE.Texture(heroImg);
  t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy()); t.needsUpdate = true;
  pantallaMat.map = t;
  await G.cede();
  renderer.initTexture(t); renderer.initTexture(tex);
  await G.cede();
  await renderer.compileAsync(scene, camera);
  await G.cede();
  pintar();                                      // primer fotograma (sombras incluidas) y fundido corto sobre la captura (css)
  raiz.classList.add('is-viva');
  if (img) { img.alt = ''; img.setAttribute('aria-hidden', 'true'); }   // la descripción de la escena va en texto (#ts-escena)
  if (captura) window.__tsCaptura = () => { pintar(); return cv.toDataURL('image/jpeg', 0.9); };

  const quieto = EV.reducedMotion || EV.mode !== 'cine';
  if (!quieto) {
    addEventListener('pointermove', e => {
      if (!visible || e.pointerType === 'touch') return;
      const r = raiz.getBoundingClientRect();
      tx = Math.max(-1, Math.min(1, ((e.clientX - r.left) / r.width) * 2 - 1));
      ty = Math.max(-1, Math.min(1, ((e.clientY - r.top) / r.height) * 2 - 1));
    }, { passive: true });
  }
  const paso = (dt) => {
    if (!visible) return;
    const k = 1 - Math.pow(0.002, dt);                    // suave, igual a cualquier fps
    const ny = ry + (tx * 3 * GRADO - ry) * k, nx = rx + (ty * 3 * GRADO - rx) * k;   // ±3°
    if (Math.abs(ny - ry) > 1e-5 || Math.abs(nx - rx) > 1e-5) { ry = ny; rx = nx; raizG.rotation.set(rx, ry, 0); sucio = true; }
    if (sucio) pintar();
  };
  if (window.gsap) gsap.ticker.add((t, dms) => paso(Math.min(0.05, (dms || 16.7) / 1000)));
  else { let u = performance.now(); const f = n => { requestAnimationFrame(f); paso(Math.min(0.05, (n - u) / 1000)); u = n; }; requestAnimationFrame(f); }

  return { visible: v => { visible = v; if (v) sucio = true; } };
}

/* Entorno de estudio oscuro (PMREM): fondo casi negro, una ventana suave arriba a
   la izquierda y una franja fría muy tenue; difuminado para reflejos sin aristas. */
function entornoOscuro(THREE, renderer) {
  const c = document.createElement('canvas'); c.width = 1024; c.height = 512; const g = c.getContext('2d');
  const bg = g.createLinearGradient(0, 0, 0, 512); bg.addColorStop(0, '#141519'); bg.addColorStop(0.55, '#08090b'); bg.addColorStop(1, '#030303');
  g.fillStyle = bg; g.fillRect(0, 0, 1024, 512);
  g.filter = 'blur(14px)';
  const mancha = (x, y, rx, ry, col) => { g.fillStyle = col; g.beginPath(); g.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2); g.fill(); };
  mancha(250, 90, 210, 70, 'rgba(255,248,236,.85)');      // la luz principal
  mancha(760, 190, 140, 22, 'rgba(170,195,255,.16)');     // franja fría (rim)
  mancha(520, 300, 380, 18, 'rgba(255,255,255,.08)');     // horizonte apenas
  const t = new THREE.CanvasTexture(c); t.mapping = THREE.EquirectangularReflectionMapping; t.colorSpace = THREE.SRGBColorSpace;
  if (G.pmrem) return G.pmrem(THREE, renderer, t).then(env => { t.dispose(); return env; });
  const pm = new THREE.PMREMGenerator(renderer); const env = pm.fromEquirectangular(t).texture; t.dispose(); pm.dispose();
  return Promise.resolve(env);
}

/* Ruido de hormigón pintado una vez en canvas (bump + roughness): grano fino,
   manchas suaves y poros oscuros. Semilla fija: igual en cada visita. */
function ruidoHormigon(THREE, renderer) {
  const N = 512, c = document.createElement('canvas'); c.width = c.height = N; const g = c.getContext('2d');
  let s = 7; const rnd = () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
  const im = g.createImageData(N, N), d = im.data;
  for (let i = 0; i < N * N; i++) { const v = 118 + (rnd() - 0.5) * 70; d[i * 4] = d[i * 4 + 1] = d[i * 4 + 2] = v; d[i * 4 + 3] = 255; }
  g.putImageData(im, 0, 0);
  for (let i = 0; i < 70; i++) { g.fillStyle = `rgba(${rnd() > 0.5 ? '255,255,255' : '0,0,0'},${0.03 + rnd() * 0.05})`; g.beginPath(); g.arc(rnd() * N, rnd() * N, 12 + rnd() * 60, 0, Math.PI * 2); g.fill(); }
  for (let i = 0; i < 900; i++) { g.fillStyle = `rgba(0,0,0,${0.35 + rnd() * 0.45})`; g.beginPath(); g.arc(rnd() * N, rnd() * N, 0.6 + rnd() * 1.8, 0, Math.PI * 2); g.fill(); }
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(2, 1.4); t.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
  return t;
}
