/* ==========================================================================
   red.js — la red de la home (desde backup-pre-red; desde backup-pre-ajustes-red,
   el fondo de TODA la home donde se ve la cuadrícula, no solo el hero). Parte del
   prototipo Downloads/evimes-hero-red/js/red.js, con la física afinada que
   fijó Oscar: R 170, PUSH 40, DRAG .2, K 60, amortiguación .32, T 160,
   paso 1/120, y cada nudo con su rigidez, su fuerza, su dirección y su
   respuesta en x/y (semilla fija por nudo). Solo se colorean los hilos
   estirados por encima de UMBRAL.
   · En reposo es la cuadrícula de css/fondo.css al píxel: mismos 24 px,
     mismo color, misma máscara y, como ella, fija a la ventana: un canvas
     fijo a pantalla completa justo encima de .bg-grid, detrás de todo (con
     él vivo, la de CSS se oculta: <html class="red-viva">). El contexto WebGL
     espera al primer gesto sobre una zona negra.
   · Coordenadas de la ventana. Solo calcula si queda algo de negro con
     cuadrícula en pantalla: se duerme cuando lo tapa todo el gris (#lateral
     abierta: EV.lateralCubre; de #lateral suelta al cierre de #para-quien).
   · gsap.ticker. Duerme en reposo; no calcula con la pestaña oculta.
     pixelRatio ≤ 2. Con movimiento reducido o sin WebGL queda la
     cuadrícula CSS, quieta.
   ========================================================================== */
import * as THREE from 'three';

const CELL = 24;                                   // el ritmo de .bg-grid
const R = 170, PUSH = 40, DRAG = .2;               // radio del "balón", cuánto empuja, cuánto arrastra
const K = 60, ZETA = .32, T = 160, H = 1 / 120;    // muelle, amortiguación, acoplamiento (débil), paso
// Variación por nudo, [mínimo, amplitud]:
const RIGIDEZ = [.65, .7], FUERZA = [.5, .6], RESPUESTA = [.8, .4], GIRO = .3;
const UMBRAL = .12;                                // estiramiento a partir del cual un hilo se colorea

const GRIS = [71, 85, 105, .18 * 255];             // la línea de .bg-grid
const BASE = new THREE.Color('#16191f');           // esa línea, ya compuesta sobre #0b0c0f
const PAL = ['#ffd84a', '#ffab2e', '#ff7a22', '#ff4f3a', '#ff3d7f'].map(c => new THREE.Color(c));

const host = document.querySelector('[data-red]');         // solo en la home
const rejilla = document.querySelector('.bg-grid');
if (host && rejilla && window.gsap && !matchMedia('(prefers-reduced-motion: reduce)').matches) iniciar();

// azar con semilla fija: el mismo nudo (i, j) sale igual en cada carga y tras un resize
function azar(i, j, canal) {
  let h = Math.imul(i + 11, 374761393) ^ Math.imul(j + 17, 668265263) ^ Math.imul(canal + 23, 1274126177);
  h = Math.imul(h ^ (h >>> 13), 1103515245);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

function iniciar() {
  const EV = window.EV || {};
  const scrollY = () => EV.home ? EV.home.scrollY() : window.scrollY;
  const m = { x: -9999, y: -9999, vx: 0, vy: 0, dentro: false, on: false };
  const tmp = new THREE.Color();
  let renderer = null, scene, cam, material, malla = null, cv;
  let estado = 'espera';                           // espera → creando → viva | sin
  let nx, ny, N, rest, disp, vel, fade, rig, amo, fx, fy, cos, sin, segs, pos, col, geo;
  let finGris = 0, despierta = false, presencia = 0, t = 0, acc = 0, maxV = 0, maxD = 0;

  const arriba = el => { let y = 0; for (let n = el; n; n = n.offsetParent) y += n.offsetTop; return y; };
  // desde backup-pre-puente el gris (#lateral → #para-quien) se cierra al final de #para-quien (.pq-fin)
  const cierre = document.querySelector('.pq-fin');
  function medir() { finGris = cierre ? arriba(cierre) : 0; }
  medir();
  if (window.ResizeObserver) new ResizeObserver(medir).observe(document.body);

  // ¿lo tapa todo el gris? #lateral abierta (la avisa ella), o de #lateral suelta hasta que empieza el cierre
  // de #para-quien (que deja ver ya los cuadros de #como)
  function tapada() {
    if (EV.lateralCubre) return true;
    const L = EV.lateralRelevo && EV.lateralRelevo();
    if (!L || !finGris) return false;
    const y = scrollY();
    return y >= L.suelta && y <= finGris;
  }

  /* ---------- puntero (coordenadas de la ventana: el canvas es fijo) ---------- */
  function dentro() { return m.dentro && !tapada(); }
  function mueve(e) {
    const x = e.clientX, y = e.clientY, antes = m.on;
    m.dentro = true;
    if (antes) { m.vx = m.vx * .6 + (x - m.x) * .4; m.vy = m.vy * .6 + (y - m.y) * .4; }
    m.x = x; m.y = y; m.on = dentro();
    if (!m.on) return;
    despierta = true;
    if (estado === 'espera') crear();
  }
  function suelta() { m.dentro = m.on = false; }
  addEventListener('pointermove', mueve, { passive: true });
  addEventListener('pointerdown', mueve, { passive: true });
  // táctil: al levantar el dedo, o si el scroll se lo lleva (pointercancel), vuelve al reposo
  addEventListener('pointerup', e => { if (e.pointerType !== 'mouse') suelta(); }, { passive: true });
  addEventListener('pointercancel', suelta, { passive: true });
  document.addEventListener('mouseleave', suelta);
  addEventListener('blur', suelta);

  /* ---------- la malla: un rectángulo de 1 px CSS por hilo (como las líneas del CSS) ---------- */
  function construir() {
    const W = cv.clientWidth, A = cv.clientHeight;
    renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
    renderer.setSize(W, A, false);
    cam.right = W; cam.bottom = A; cam.updateProjectionMatrix();

    nx = Math.ceil(W / CELL) + 3; ny = Math.ceil(A / CELL) + 3; N = nx * ny;
    rest = new Float32Array(N * 2); disp = new Float32Array(N * 2); vel = new Float32Array(N * 2);
    [fade, rig, amo, fx, fy, cos, sin] = Array.from({ length: 7 }, () => new Float32Array(N));
    const pares = [];
    for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) {
      const n = j * nx + i, x = (i - 1) * CELL, y = (j - 1) * CELL;
      rest[n * 2] = x; rest[n * 2 + 1] = y;
      // la máscara de .bg-grid: ellipse 90% 70% at 50% 40%, #000 70%, transparent 100%
      fade[n] = Math.max(0, Math.min(1, (1 - Math.hypot((x - W * .5) / (W * .9), (y - A * .4) / (A * .7))) / .3));
      rig[n] = K * (RIGIDEZ[0] + RIGIDEZ[1] * azar(i, j, 0));
      amo[n] = 2 * ZETA * Math.sqrt(rig[n]);
      const fuerza = FUERZA[0] + FUERZA[1] * azar(i, j, 1), giro = (azar(i, j, 2) * 2 - 1) * GIRO;
      cos[n] = Math.cos(giro); sin[n] = Math.sin(giro);
      fx[n] = fuerza * (RESPUESTA[0] + RESPUESTA[1] * azar(i, j, 3));
      fy[n] = fuerza * (RESPUESTA[0] + RESPUESTA[1] * azar(i, j, 4));
      if (i < nx - 1) pares.push(n, n + 1);
      if (j < ny - 1) pares.push(n, n + nx);
    }
    segs = Uint32Array.from(pares);

    const S = segs.length / 2, idx = new Uint32Array(S * 6);
    for (let s = 0; s < S; s++) { const v = s * 4; idx.set([v, v + 1, v + 2, v + 2, v + 1, v + 3], s * 6); }
    pos = new Float32Array(S * 12); col = new Uint8Array(S * 16);
    if (malla) { scene.remove(malla); geo.dispose(); }
    geo = new THREE.BufferGeometry();
    geo.setIndex(new THREE.BufferAttribute(idx, 1));
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3).setUsage(THREE.DynamicDrawUsage));
    geo.setAttribute('tinte', new THREE.BufferAttribute(col, 4, true).setUsage(THREE.DynamicDrawUsage));
    malla = new THREE.Mesh(geo, material);
    malla.frustumCulled = false;
    scene.add(malla);
  }

  /* ---------- simulación ---------- */
  function paso() {
    presencia += ((m.on ? 1 : 0) - presencia) * .08;
    if (presencia < .001 && !m.on) presencia = 0;
    m.vx *= .92; m.vy *= .92;
    const R2 = R * R;
    maxV = maxD = 0;
    for (let j = 1; j < ny - 1; j++) for (let i = 1; i < nx - 1; i++) {
      const n = j * nx + i, a = n * 2, b = a + 1;
      let tx = 0, ty = 0;
      if (presencia) {
        const dx = rest[a] - m.x, dy = rest[b] - m.y, d2 = dx * dx + dy * dy;
        if (d2 < R2) {
          // empuje hacia fuera, máximo a media distancia (las celdas del centro se abren)
          const d = Math.sqrt(d2) || 1, u = d / R, f = PUSH * Math.sin(Math.PI * u) * (1 - u * .35) / d;
          tx = (dx * cos[n] - dy * sin[n]) * f;
          ty = (dx * sin[n] + dy * cos[n]) * f;
          const g = (1 - u) * (1 - u) * DRAG * 6;  // y la red se deja arrastrar en la dirección del gesto
          tx = (tx + m.vx * g) * fx[n] * presencia;
          ty = (ty + m.vy * g) * fy[n] * presencia;
        }
      }
      const lx = disp[a - 2] + disp[a + 2] + disp[a - nx * 2] + disp[a + nx * 2] - 4 * disp[a];
      const ly = disp[b - 2] + disp[b + 2] + disp[b - nx * 2] + disp[b + nx * 2] - 4 * disp[b];
      vel[a] += (rig[n] * (tx - disp[a]) + T * lx - amo[n] * vel[a]) * H;
      vel[b] += (rig[n] * (ty - disp[b]) + T * ly - amo[n] * vel[b]) * H;
      maxV = Math.max(maxV, Math.abs(vel[a]) + Math.abs(vel[b]));
      maxD = Math.max(maxD, Math.abs(disp[a]) + Math.abs(disp[b]));
    }
    for (let k = 0; k < N * 2; k++) disp[k] += vel[k] * H;
  }

  /* ---------- dibujo ---------- */
  function pintar() {
    for (let s = 0, p = 0, c = 0; s < segs.length; s += 2, p += 12, c += 16) {
      const a = segs[s], b = segs[s + 1];
      // + .5: el centro del píxel que pinta el degradado del CSS
      const ax = rest[a * 2] + disp[a * 2] + .5, ay = rest[a * 2 + 1] + disp[a * 2 + 1] + .5;
      const bx = rest[b * 2] + disp[b * 2] + .5, by = rest[b * 2 + 1] + disp[b * 2 + 1] + .5;
      const dx = bx - ax, dy = by - ay, largo = Math.sqrt(dx * dx + dy * dy) || 1;
      const ox = -dy / largo * .5, oy = dx / largo * .5;
      pos[p] = ax + ox; pos[p + 1] = ay + oy;
      pos[p + 3] = ax - ox; pos[p + 4] = ay - oy;
      pos[p + 6] = bx + ox; pos[p + 7] = by + oy;
      pos[p + 9] = bx - ox; pos[p + 10] = by - oy;

      const estira = largo / CELL - 1;
      let r = GRIS[0], g = GRIS[1], l = GRIS[2], aa = GRIS[3] * fade[a], ab = GRIS[3] * fade[b];
      if (estira > UMBRAL) {
        const calor = Math.min(1, (estira - UMBRAL) * 4.2), hv = Math.pow(calor, .7);
        // el sitio y el tiempo desplazan el tono: la mancha tiene varios colores, no uno
        const onda = Math.sin((ax + bx) * .006 + t * .6) + Math.cos((ay + by) * .0075 - t * .4);
        const q = Math.min(PAL.length - 1.001, Math.max(0, calor * 3 + onda * .6)), i = Math.floor(q);
        tmp.copy(PAL[i]).lerp(PAL[i + 1], q - i).lerp(BASE, 1 - hv).convertLinearToSRGB();
        r = tmp.r * 255; g = tmp.g * 255; l = tmp.b * 255;
        aa = Math.max(fade[a], hv) * 255; ab = Math.max(fade[b], hv) * 255;
      }
      for (let v = 0; v < 16; v += 4) {
        col[c + v] = r; col[c + v + 1] = g; col[c + v + 2] = l;
        col[c + v + 3] = Math.round(v < 8 ? aa : ab);
      }
    }
    geo.attributes.position.needsUpdate = true;
    geo.attributes.tinte.needsUpdate = true;
    renderer.render(scene, cam);
  }

  /* ---------- se crea con el primer gesto sobre una zona negra ---------- */
  async function crear() {
    estado = 'creando';
    cv = document.createElement('canvas');
    cv.className = 'red-canvas';
    cv.setAttribute('aria-hidden', 'true');
    rejilla.after(cv);                             // justo encima de la cuadrícula CSS, detrás de todo
    try {
      renderer = new THREE.WebGLRenderer({ canvas: cv, antialias: true, alpha: false });
      renderer.debug.checkShaderErrors = false;
      renderer.setClearColor(0x0b0c0f, 1);
      scene = new THREE.Scene();
      cam = new THREE.OrthographicCamera(0, 1, 0, 1, -1, 1);
      // sin conversión de color: el alfa se compone en sRGB, igual que en CSS
      material = new THREE.ShaderMaterial({
        transparent: true, depthTest: false, depthWrite: false, side: THREE.DoubleSide, forceSinglePass: true,
        vertexShader: 'attribute vec4 tinte; varying vec4 vTinte; void main() { vTinte = tinte; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }',
        fragmentShader: 'varying vec4 vTinte; void main() { gl_FragColor = vTinte; }'
      });
      construir();
      await renderer.compileAsync(scene, cam);
      pintar();
    } catch (e) {
      estado = 'sin';
      cv.remove();                                 // sin WebGL: sigue la cuadrícula CSS
      console.warn('[red] sin WebGL: se queda la cuadrícula', e);
      return;
    }
    const raiz = document.documentElement;
    cv.addEventListener('webglcontextlost', () => raiz.classList.remove('red-viva'));
    cv.addEventListener('webglcontextrestored', () => { pintar(); raiz.classList.add('red-viva'); });
    raiz.classList.add('red-viva');
    estado = 'viva';
    gsap.ticker.add(fotograma);
  }

  function fotograma(tiempo, dms) {
    if (!despierta || document.hidden) return;
    if (tapada()) { m.on = false; acc = 0; return; }   // no se ve: dormida (sigue donde estaba al volver)
    m.on = m.dentro;                               // también si lo que se mueve es la página
    acc += Math.min(.05, dms / 1000);
    let n = 0;
    while (acc >= H && n < 4) { paso(); acc -= H; n++; }
    if (n === 4) acc = 0;
    if (!n) return;                                // pantallas de más de 120 Hz
    t += 1 / 60;
    if (!m.on && !presencia && maxV < .5 && maxD < .1) {
      disp.fill(0); vel.fill(0);                   // reposo exacto y a dormir
      despierta = false; acc = 0;
    }
    pintar();
  }

  addEventListener('resize', () => {
    medir();
    if (estado === 'viva') { construir(); pintar(); }
  });
}
