/* ==========================================================================
   onda.js — "La onda de cromo": 7 bandas metálicas (Three.js 0.160.0) con la
   forma EXACTA de la línea que cruza el monograma EH (constante P).
   · Cromo pulido (MeshPhysicalMaterial) sobre un estudio navy con luces
     blancas y vetas cian/violeta: reflejan "los rayos".
   · Una línea de luz cian por banda que la recorre de punta a punta
     (shader aditivo sobre la UV del tubo), cada una con su desfase.
   · Tubos individuales: cada tubo es un muelle propio (rigidez, retraso y
     respiración distintos, sin acoplamiento) que se aparta del cursor con
     caída gaussiana. Campo de 96 puntos × 7 tubos en CPU, paso fijo 1/120 s
     (máx. 4 sub-pasos por fotograma), que los vertex shaders leen de una DataTexture.
   · Arranque escalonado (fix TBT, js/escenas.js): la escena se monta en su
     turno, troceada (geometrías en js/geo-worker.js, PMREM y shaders
     compilados en paralelo con compileAsync) y sin tareas largas.
   · Los dos extremos de cada banda se funden (alpha sobre la UV): nunca se
     ve el corte del tubo y la banda se apaga antes de llegar al texto.
   Un solo renderer. No tiene bucle propio: js/home.js llama a render() desde
   gsap.ticker. dpr ≤ 2, baja solo si el fotograma va lento.
   ========================================================================== */
(function () {
  var EV = (window.EV = window.EV || {});
  var THREE_URL = 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.min.js';

  // Línea central de la banda del logo EH (normalizada desde el vector:
  // x 0..1, y 0..1 de arriba abajo). NO TOCAR: es la forma de la marca.
  var P = [[0, .506], [.107, .536], [.203, .545], [.574, .485], [.67, .467], [.813, .455], [.909, .467], [1, .495]];
  var N = 7;

  // Tubos: cada uno se mueve por su cuenta (v-tubos-individual). Campo de
  // desplazamiento (CPU) de W puntos × N tubos: u = desplazamiento en Y local
  // del tubo, v = velocidad. Cada tubo es un muelle independiente (sin
  // acoplamiento entre tubos) que sigue a su objetivo:
  //   objetivo = tanh(lado/30) · push · exp(−d²/radius²) · presence + respiración
  // con su propio retraso; la tensión (26) solo une puntos del MISMO tubo.
  // Se sube cada fotograma a una DataTexture que leen los vertex shaders.
  var TUBE = { W: 96, step: 1 / 120, maxSteps: 4, push: 0.52, radius: 210, max: 0.62, tension: 26, zeta: 0.82, breath: 0.032, breathSp: 0.07 };
  // Carácter de cada tubo: valores fijos por índice (no cambian entre cargas).
  var tubeK = [22, 31, 16, 27, 14, 34, 19];                           // rigidez 14–34
  var tubeC = tubeK.map(function (k) { return 2 * TUBE.zeta * Math.sqrt(k); });   // casi crítica: sin rebotes
  var tubeLag = [0.10, 0.06, 0.15, 0.08, 0.18, 0.12, 0.07];          // retraso al seguir al cursor (s)
  var tubePh = [0, 1.7, 3.1, 0.9, 4.4, 2.3, 5.6];                    // fase de la respiración
  var tubeSp = [1, 1.27, 0.84, 1.13, 0.92, 1.38, 1.06];              // velocidad propia de la respiración
  var fieldU = new Float32Array(TUBE.W * N), fieldV = new Float32Array(TUBE.W * N);
  var target = new Float32Array(TUBE.W * N);                         // objetivo (con el retraso de cada tubo)
  var fieldTex = null, acc = 0, tSim = 0, presence = 0;
  var ptr = { x: 0, y: 0, dentro: false };
  var _v, _o;                                    // vectores de trabajo

  var EV_GLSL =
    'uniform sampler2D uField;uniform float uBand;uniform float uW;uniform float uN;attribute float aS;\n' +
    // Interpolación manual Catmull-Rom (4 muestras): pasa por los 96 valores
    // sin aristas; la lineal dibujaba una poligonal (~30 px entre muestras).
    'float evTap(float i,float y){return texture2D(uField,vec2((clamp(i,0.,uW-1.)+.5)/uW,y)).r;}\n' +
    'float evField(float s){float x=clamp(s,0.,1.)*(uW-1.);float i1=floor(x);float t=x-i1;float y=(uBand+.5)/uN;' +
    'float p0=evTap(i1-1.,y),p1=evTap(i1,y),p2=evTap(i1+1.,y),p3=evTap(i1+2.,y);' +
    'return p1+.5*t*(p2-p0+t*(2.*p0-5.*p1+4.*p2-p3+t*(3.*(p1-p2)+p3-p0)));}\n' +
    'vec3 evDisplace(vec3 p){return p+vec3(0.,evField(aS),0.);}\n';

  var T, renderer, scene, camera, group, canvas;
  var bands = [];
  var fadeU = { value: null };
  var base = { x: 7.4, y: 0.2 };
  var s = { mx: 0, my: 0, hero: 0 };           // estado suavizado
  var dpr = 1, maxDpr = 1, slow = 0, mobile = false, w = 0, h = 0;
  var primero = false;
  var cargando = null;                       // init protegido: un solo renderer y una sola escena
  var G = EV.gpu || { cede: function () { return new Promise(function (r) { setTimeout(r, 0); }); }, turno: function (fn) { return Promise.resolve().then(fn); } };

  function env() {
    var c = document.createElement('canvas'); c.width = 1024; c.height = 512;
    var g = c.getContext('2d');
    var bg = g.createLinearGradient(0, 0, 0, 512);
    bg.addColorStop(0, '#1a2440'); bg.addColorStop(0.5, '#0a0f1d'); bg.addColorStop(1, '#05070d');
    g.fillStyle = bg; g.fillRect(0, 0, 1024, 512);
    function box(x, y, bw, bh, col, a) {
      var gr = g.createLinearGradient(x, y, x, y + bh);
      gr.addColorStop(0, 'rgba(' + col + ',0)'); gr.addColorStop(0.5, 'rgba(' + col + ',' + a + ')'); gr.addColorStop(1, 'rgba(' + col + ',0)');
      g.fillStyle = gr; g.fillRect(x, y, bw, bh);
    }
    box(80, 40, 640, 150, '255,255,255', 1);      // caja de luz grande
    box(0, 190, 1024, 26, '255,255,255', 0.55);
    box(560, 300, 380, 70, '235,242,255', 0.7);
    box(700, 130, 220, 60, '230,240,255', 0.6);
    box(0, 250, 1024, 40, '0,229,255', 0.55);     // veta cian
    box(380, 330, 420, 30, '150,110,255', 0.45);  // veta violeta
    box(60, 380, 260, 24, '0,229,255', 0.35);
    var t = new T.CanvasTexture(c);
    t.mapping = T.EquirectangularReflectionMapping; t.colorSpace = T.SRGBColorSpace;
    if (G.pmrem) return G.pmrem(T, renderer, t).then(function (e) { scene.environment = e; t.dispose(); });
    var pm = new T.PMREMGenerator(renderer);
    scene.environment = pm.fromEquirectangular(t).texture;
    t.dispose(); pm.dispose();
    return Promise.resolve();
  }

  function bandCurve(L, amp) {
    var pts = [new T.Vector3(-L * 0.62, -(P[0][1] - 0.5) * amp * L, 0)];
    P.forEach(function (p) { pts.push(new T.Vector3((p[0] - 0.5) * L, -(p[1] - 0.5) * amp * L, 0)); });
    pts.push(new T.Vector3(L * 0.62, -(P[P.length - 1][1] - 0.5) * amp * L, 0));
    return new T.CatmullRomCurve3(pts, false, 'centripetal');
  }

  // Cromo de un tubo: el físico compartido + fundido de extremos + campo de
  // cuerdas. Un material por tubo (uBand), un solo programa (cache key).
  function makeChrome(base, u) {
    var mat = base.clone();
    mat.onBeforeCompile = function (sh) {
      sh.uniforms.uFade = fadeU;
      Object.assign(sh.uniforms, u);
      sh.vertexShader = sh.vertexShader
        .replace('#include <common>', '#include <common>\nvarying float vAlong;\n' + EV_GLSL)
        .replace('#include <begin_vertex>', 'vec3 transformed = evDisplace(vec3(position));\nvAlong = uv.x;');
      sh.fragmentShader = sh.fragmentShader
        .replace('#include <common>', '#include <common>\nvarying float vAlong;\nuniform vec4 uFade;')
        .replace('#include <dithering_fragment>',
          '#include <dithering_fragment>\ngl_FragColor.a *= smoothstep(uFade.x, uFade.y, vAlong) * (1.0 - smoothstep(uFade.z, uFade.w, vAlong));');
    };
    mat.customProgramCacheKey = function () { return 'ev-chrome'; };
    return mat;
  }

  function lightMat(col, u) {
    return new T.ShaderMaterial({
      transparent: true, depthWrite: false, blending: T.AdditiveBlending,
      uniforms: Object.assign({ uHead: { value: -2 }, uCol: { value: new T.Color(col) }, uAlpha: { value: 1 }, uFade: fadeU }, u),
      vertexShader:
        EV_GLSL + 'varying vec2 vUv;varying vec3 vN;varying vec3 vV;' +
        'void main(){vUv=uv;vec4 mv=modelViewMatrix*vec4(evDisplace(position),1.);vN=normalize(normalMatrix*normal);vV=normalize(-mv.xyz);gl_Position=projectionMatrix*mv;}',
      fragmentShader:
        'uniform float uHead;uniform vec3 uCol;uniform float uAlpha;uniform vec4 uFade;varying vec2 vUv;varying vec3 vN;varying vec3 vV;' +
        'void main(){float d=vUv.x-uHead;float trail=d<0.?exp(d*14.):exp(-d*260.);float core=d<0.?exp(d*90.):exp(-d*260.);' +
        'float face=pow(max(dot(vN,vV),0.),1.6);' +
        'float ends=smoothstep(uFade.x,uFade.y,vUv.x)*(1.-smoothstep(uFade.z,uFade.w,vUv.x));' +
        'float a=(trail*.55+core*1.2)*(.25+.75*face)*uAlpha*ends;' +
        'gl_FragColor=vec4(uCol*(1.+core*1.6),a);}'
    });
  }

  async function build() {
    scene = new T.Scene();
    camera = new T.PerspectiveCamera(32, 1, 0.1, 100);
    camera.position.set(0, 0, 14);
    await env();
    await G.cede();
    fadeU.value = new T.Vector4(0.06, 0.3, 0.97, 1.0);

    var chrome = new T.MeshPhysicalMaterial({
      color: 0xdfe6f0, metalness: 1, roughness: 0.13, clearcoat: 0.8, clearcoatRoughness: 0.08,
      envMapIntensity: 1.7, transparent: true
    });
    fieldTex = new T.DataTexture(fieldU, TUBE.W, N, T.RedFormat, T.FloatType);
    fieldTex.minFilter = fieldTex.magFilter = T.NearestFilter;
    fieldTex.needsUpdate = true;
    _v = new T.Vector3(); _o = new T.Vector3();
    var tub = mobile ? 260 : 420, rad = mobile ? 18 : 28, radL = mobile ? 12 : 20;

    group = new T.Group(); scene.add(group);
    // Las 14 geometrías (cromo + luz de cada banda) se generan en js/geo-worker.js
    // (EV.gpu.geometria: mismo TubeGeometry, mismos parámetros); se piden todas a la vez.
    var r = 0.12, curvas = [], geos = [];
    var tubo = function (curve, radio, radial) {
      if (!G.geometria) { var g0 = new T.TubeGeometry(curve, tub, radio, radial, false); g0.scale(1, 1.55, 0.38); addS(g0); return Promise.resolve(g0); }
      return G.geometria(T, { tipo: 'tube', pts: curve.points.map(function (v) { return [v.x, v.y, v.z]; }), curva: 'centripetal', seg: tub, r: radio, radial: radial }, [['scale', 1, 1.55, 0.38], ['aS']]);
    };
    for (var j = 0; j < N; j++) {
      curvas.push(bandCurve(20 + j * 0.9, 0.95));
      geos.push(Promise.all([tubo(curvas[j], r, rad), tubo(curvas[j], r * 1.04, radL)]));
    }
    for (var i = 0; i < N; i++) {
      var curve = curvas[i];
      var par = await geos[i], geo = par[0], lgeo = par[1];
      var u = { uField: { value: fieldTex }, uBand: { value: i }, uW: { value: TUBE.W }, uN: { value: N } };
      var mesh = new T.Mesh(geo, makeChrome(chrome, u));
      mesh.renderOrder = N - i;                     // de atrás hacia delante
      var lm = lightMat(i % 3 === 1 ? 0x9ef6ff : 0x00e5ff, u);
      var light = new T.Mesh(lgeo, lm);
      light.renderOrder = 100 + i;
      var g = new T.Group(); g.add(mesh, light);
      g.position.set(i * 0.12, i * 0.62, -i * 0.55);
      group.add(g);
      // Los 96 puntos de la cuerda en el espacio del tubo (misma escala que la geometría).
      var pts = new Float32Array(TUBE.W * 3);
      for (var k = 0; k < TUBE.W; k++) {
        var q = curve.getPointAt(k / (TUBE.W - 1));
        pts[k * 3] = q.x; pts[k * 3 + 1] = q.y * 1.55; pts[k * 3 + 2] = q.z * 0.38;
      }
      bands.push({ g: g, lm: lm, pts: pts, head: i * 0.37 - 0.3, speed: (0.11 + (i % 3) * 0.025) * 0.5 });   // luz: a la mitad
      await G.cede();                               // una banda por tarea: ninguna pasa de ~50 ms
    }
    group.rotation.set(0.18, -0.32, 0.46);
  }

  // aS = posición a lo largo del tubo (0..1): índice en el campo de cuerdas.
  function addS(geo) {
    var uv = geo.attributes.uv, a = new Float32Array(uv.count);
    for (var i = 0; i < uv.count; i++) a[i] = uv.getX(i);
    geo.setAttribute('aS', new T.BufferAttribute(a, 1));
  }

  /* Objetivo de cada punto de cada tubo. Cerca del cursor, el tubo se aparta
     hacia el lado contrario: "lado" es la distancia (px) del cursor al punto
     medida sobre la normal del tubo en pantalla; tanh(lado/30) da el sentido
     sin salto al cruzar la línea. Caída gaussiana con la distancia y
     presence (0..1) para entrar y salir suave. Más una respiración lenta que
     recorre cada tubo por separado (sin(π·s): los extremos no se mueven).
     Cada tubo sigue su objetivo con su propio retraso (1er orden, por dt). */
  function objetivos(dt) {
    var W = TUBE.W, r2 = TUBE.radius * TUBE.radius, cerca = presence > 0.001;
    if (cerca) group.updateMatrixWorld();
    for (var b = 0; b < N; b++) {
      var m = bands[b].g.matrixWorld, pts = bands[b].pts;
      var kl = 1 - Math.exp(-dt / tubeLag[b]);
      var fase = tSim * TUBE.breathSp * tubeSp[b] * 6.2832 - tubePh[b];
      for (var k = 0; k < W; k++) {
        var s0 = k / (W - 1), raw = TUBE.breath * Math.sin(Math.PI * s0) * Math.sin(s0 * 6.2832 - fase);
        if (cerca) {
          _v.set(pts[k * 3], pts[k * 3 + 1], pts[k * 3 + 2]);
          _o.copy(_v); _o.y += 0.1;
          _v.applyMatrix4(m).project(camera);
          var sx = (_v.x * 0.5 + 0.5) * w, sy = (-_v.y * 0.5 + 0.5) * h;
          var dx = sx - ptr.x, dy = sy - ptr.y, d2 = dx * dx + dy * dy;
          if (d2 < r2 * 9) {                         // más allá de 3 radios: exp ≈ 0
            _o.applyMatrix4(m).project(camera);
            var nx = (_o.x * 0.5 + 0.5) * w - sx, ny = (-_o.y * 0.5 + 0.5) * h - sy;
            var nl = Math.sqrt(nx * nx + ny * ny) || 1;
            var lado = (dx * nx + dy * ny) / nl;      // + = el tubo está del lado +normal del cursor
            raw += Math.tanh(lado / 30) * TUBE.push * Math.exp(-d2 / r2) * presence;
          }
        }
        var i = b * W + k;
        target[i] += (raw - target[i]) * kl;
      }
    }
  }

  /* Un paso semi-implícito de 1/120 s: cada tubo, su muelle; la tensión solo
     entre puntos vecinos del mismo tubo (en los extremos, el propio punto). */
  function paso(hs) {
    var W = TUBE.W, lim = TUBE.max, ten = TUBE.tension;
    for (var b = 0; b < N; b++) {
      var kk = tubeK[b], cc = tubeC[b];
      for (var k = 0; k < W; k++) {
        var i = b * W + k, u = fieldU[i];
        var l = k > 0 ? fieldU[i - 1] : u, r = k < W - 1 ? fieldU[i + 1] : u;
        var a = kk * (target[i] - u) - cc * fieldV[i] + ten * (l + r - 2 * u);
        fieldV[i] += a * hs;
      }
    }
    for (var j = 0; j < fieldU.length; j++) {
      var nu = fieldU[j] + fieldV[j] * hs;
      fieldU[j] = nu > lim ? lim : nu < -lim ? -lim : nu;
    }
  }

  /* Paso fijo (acumulador, máx. 4 pasos por fotograma; si el fotograma es más largo,
     el tiempo sobrante se descarta): igual a cualquier fps por encima de 30.
     Sin movimiento (reduced motion): todo a cero, tubos quietos. */
  var parado = false;
  function simular(dt, activo) {
    if (!activo) {
      if (!parado) { fieldU.fill(0); fieldV.fill(0); target.fill(0); presence = 0; acc = 0; fieldTex.needsUpdate = true; parado = true; }
      return;
    }
    parado = false;
    tSim += dt;
    presence += ((ptr.dentro ? 1 : 0) - presence) * (1 - Math.exp(-3 * dt));
    objetivos(dt);
    acc = Math.min(acc + dt, TUBE.step * TUBE.maxSteps);
    while (acc >= TUBE.step) { paso(TUBE.step); acc -= TUBE.step; }
    fieldTex.needsUpdate = true;
  }

  // El tamaño del canvas se lee solo cuando cambia (ResizeObserver): leer clientWidth en
  // cada fotograma forzaba un recálculo de estilos tras los cambios de opacidad del bucle.
  var medir = true, ro = null;
  function resize() {
    if (!renderer) return;
    if (!ro && window.ResizeObserver) { ro = new ResizeObserver(function () { medir = true; }); ro.observe(canvas); }
    if (!medir && ro) return;
    medir = false;
    var cw = canvas.clientWidth, ch = canvas.clientHeight;
    if (cw === w && ch === h) return;
    w = cw; h = ch;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    var narrow = w < 720;
    camera.fov = narrow ? 44 : 32;
    camera.updateProjectionMatrix();
    // Móvil: las bandas arriba, el texto abajo (nunca detrás del H1).
    base.x = narrow ? 2.4 : 7.4;
    base.y = narrow ? 3.5 : 0.2;
    // Fundido izquierdo: la banda es invisible antes de llegar al bloque del H1.
    if (fadeU.value) fadeU.value.set(narrow ? 0.06 : 0.16, narrow ? 0.36 : 0.44, 0.97, 1.0);
  }

  function place(i) {
    // Ratón: amplitud a la mitad. Scroll del hero: recorrido un 40 % menor.
    group.position.x = base.x + s.mx * -0.175;
    group.position.y = base.y + s.my * 0.125 + s.hero * 1.32;
    group.rotation.x = 0.18 + s.my * 0.03 + s.hero * 0.21;
    group.rotation.y = -0.32 + s.mx * 0.04 - s.hero * 0.108;
    group.rotation.z = 0.46 + s.hero * 0.096;
  }

  /* Montaje troceado (dentro de EV.gpu.turno): renderer → entorno → una banda
     por tarea → shaders compilados en paralelo → primer fotograma. Entre paso y
     paso se cede el hilo: ninguna tarea larga en la carga. */
  async function montar() {
    renderer = new T.WebGLRenderer({ canvas: canvas, antialias: true, alpha: true, powerPreference: 'high-performance', preserveDrawingBuffer: false });
    maxDpr = Math.min(window.devicePixelRatio || 1, 2);
    dpr = maxDpr;
    renderer.debug.checkShaderErrors = false;      // producción: sin esperas síncronas en el primer uso de cada programa
    renderer.setPixelRatio(dpr);
    renderer.setClearColor(0x000000, 0);
    renderer.outputColorSpace = T.SRGBColorSpace;
    renderer.toneMapping = T.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.3;
    await G.cede();
    await build();
    resize();
    place();
    await renderer.compileAsync(scene, camera);   // shaders en paralelo (KHR_parallel_shader_compile): no bloquea
    await G.cede();
    renderer.render(scene, camera);               // primer fotograma: sube las geometrías (aún con el póster delante)
    await G.cede();
    EV.onda.ok = true;
    return true;
  }

  EV.onda = {
    ok: false,

    /* Carga Three.js y monta la escena. Resuelve true si hay WebGL. */
    load: function (cv) {
      // Nunca dos veces (gesto repetido, otra llamada, vuelta desde bfcache): la misma promesa.
      if (cargando) return cargando;
      canvas = cv;
      mobile = Math.min(screen.width, screen.height) < 720 || matchMedia('(pointer: coarse)').matches;
      cargando = import(THREE_URL).then(function (mod) {
        T = mod;
        return G.turno(montar, 10);                 // la onda del hero va antes que cualquier otra escena
      });
      cargando.catch(function () { cargando = null; });
      return cargando;
    },
    resize: resize,

    /* Un "pulso" en los tubos (sin uso ahora): un golpe de velocidad gaussiano
       (unidades/s) que cada muelle devuelve solo a su sitio. */
    pulso: function (f) {
      if (!fieldTex || EV.reducedMotion) return;
      f = f || 6;
      var W = TUBE.W, c = W * 0.62;
      for (var b = 0; b < N; b++) {
        for (var k = 0; k < W; k++) fieldV[b * W + k] += f * Math.exp(-Math.pow((k - c) / 6, 2)) * (1 - b * 0.06);
      }
    },

    /* Puntero en px de la ventana (ratón o dedo). dentro=false: presence baja
       sola y los tubos vuelven; se guarda la última posición para que no salten. */
    pointer: function (x, y, dentro) { if (dentro) { ptr.x = x; ptr.y = y; } ptr.dentro = dentro; },

    /* dt: segundos · inp: { mx, my (−0.5..0.5), hero (0..1), luz, cuerdas (bool) } */
    render: function (dt, inp) {
      if (!renderer) return;
      // Primer fotograma en vivo: delta limitado (el de la carga puede ser enorme).
      if (!primero) { primero = true; dt = Math.min(dt, 1 / 60); }
      resize();
      var k =1 - Math.pow(1 - 0.018, dt * 60);    // inclinación por el ratón: lerp 0.018 a 60 fps (antes 0.05)
      var kh = 1 - Math.pow(1 - 0.035, dt * 60);   // scroll del hero: 0.035 (antes 0.08)
      s.mx += (inp.mx - s.mx) * k;
      s.my += (inp.my - s.my) * k;
      s.hero += (inp.hero - s.hero) * kh;
      place();
      for (var i = 0; i < bands.length; i++) {
        var b = bands[i];
        if (inp.luz) {
          // La luz avanza integrando la velocidad: acelerar no la hace saltar.
          b.head += dt * b.speed * (1 + s.hero * 0.96);   // aceleración con el scroll, 40 % menos
          if (b.head > 1.3) b.head -= 1.6;
          b.lm.uniforms.uHead.value = b.head;
          b.g.position.z = -i * 0.55 + Math.sin(performance.now() / 1000 * 0.175 + i * 0.7) * 0.06;   // deriva a la mitad de velocidad
        } else b.lm.uniforms.uHead.value = -2;
      }
      simular(dt, !!inp.cuerdas);
      renderer.render(scene, camera);

      // Calidad adaptativa: si los fotogramas pasan de ~22 ms, baja el dpr.
      if (dt > 0.022 && dt < 0.25) slow += dt; else slow = Math.max(0, slow - dt * 0.5);
      if (slow > 1.2 && dpr > 1) {
        dpr = Math.max(1, dpr - 0.5); slow = 0;
        renderer.setPixelRatio(dpr); w = h = 0; medir = true; resize();
      }
    },

    /* Fotograma fijo (sin luces) para la versión fija: PNG con transparencia. */
    capture: function () {
      s.mx = s.my = s.hero = 0; place();
      bands.forEach(function (b, i) { b.lm.uniforms.uHead.value = -2; b.g.position.z = -i * 0.55; });
      fieldU.fill(0); fieldV.fill(0); target.fill(0); presence = 0; fieldTex.needsUpdate = true;
      renderer.render(scene, camera);
      return canvas.toDataURL('image/png');
    },

    get dpr() { return dpr; }
  };
})();
