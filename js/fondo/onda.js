/* ==========================================================================
   onda.js — "La onda de cromo": 7 bandas metálicas (Three.js 0.160.0) con la
   forma EXACTA de la línea que cruza el monograma EH (constante P).
   · Cromo pulido (MeshPhysicalMaterial) sobre un estudio navy con luces
     blancas y vetas cian/violeta: reflejan "los rayos".
   · Una línea de luz cian por banda que la recorre de punta a punta
     (shader aditivo sobre la UV del tubo), cada una con su desfase.
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

  var T, renderer, scene, camera, group, canvas;
  var bands = [];
  var fadeU = { value: null };
  var base = { x: 7.4, y: 0.2 };
  var s = { mx: 0, my: 0, hero: 0 };           // estado suavizado
  var dpr = 1, maxDpr = 1, slow = 0, mobile = false, w = 0, h = 0;

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
    var pm = new T.PMREMGenerator(renderer);
    scene.environment = pm.fromEquirectangular(t).texture;
    t.dispose(); pm.dispose();
  }

  function bandCurve(L, amp) {
    var pts = [new T.Vector3(-L * 0.62, -(P[0][1] - 0.5) * amp * L, 0)];
    P.forEach(function (p) { pts.push(new T.Vector3((p[0] - 0.5) * L, -(p[1] - 0.5) * amp * L, 0)); });
    pts.push(new T.Vector3(L * 0.62, -(P[P.length - 1][1] - 0.5) * amp * L, 0));
    return new T.CatmullRomCurve3(pts, false, 'centripetal');
  }

  // Fundido de los extremos en el cromo (inyectado en el shader físico).
  function withFade(mat) {
    mat.onBeforeCompile = function (sh) {
      sh.uniforms.uFade = fadeU;
      sh.vertexShader = sh.vertexShader
        .replace('#include <common>', '#include <common>\nvarying float vAlong;')
        .replace('#include <begin_vertex>', '#include <begin_vertex>\nvAlong = uv.x;');
      sh.fragmentShader = sh.fragmentShader
        .replace('#include <common>', '#include <common>\nvarying float vAlong;\nuniform vec4 uFade;')
        .replace('#include <dithering_fragment>',
          '#include <dithering_fragment>\ngl_FragColor.a *= smoothstep(uFade.x, uFade.y, vAlong) * (1.0 - smoothstep(uFade.z, uFade.w, vAlong));');
    };
    return mat;
  }

  function lightMat(col) {
    return new T.ShaderMaterial({
      transparent: true, depthWrite: false, blending: T.AdditiveBlending,
      uniforms: { uHead: { value: -2 }, uCol: { value: new T.Color(col) }, uAlpha: { value: 1 }, uFade: fadeU },
      vertexShader:
        'varying vec2 vUv;varying vec3 vN;varying vec3 vV;' +
        'void main(){vUv=uv;vec4 mv=modelViewMatrix*vec4(position,1.);vN=normalize(normalMatrix*normal);vV=normalize(-mv.xyz);gl_Position=projectionMatrix*mv;}',
      fragmentShader:
        'uniform float uHead;uniform vec3 uCol;uniform float uAlpha;uniform vec4 uFade;varying vec2 vUv;varying vec3 vN;varying vec3 vV;' +
        'void main(){float d=vUv.x-uHead;float trail=d<0.?exp(d*14.):exp(-d*260.);float core=d<0.?exp(d*90.):exp(-d*260.);' +
        'float face=pow(max(dot(vN,vV),0.),1.6);' +
        'float ends=smoothstep(uFade.x,uFade.y,vUv.x)*(1.-smoothstep(uFade.z,uFade.w,vUv.x));' +
        'float a=(trail*.55+core*1.2)*(.25+.75*face)*uAlpha*ends;' +
        'gl_FragColor=vec4(uCol*(1.+core*1.6),a);}'
    });
  }

  function build() {
    scene = new T.Scene();
    camera = new T.PerspectiveCamera(32, 1, 0.1, 100);
    camera.position.set(0, 0, 14);
    env();
    fadeU.value = new T.Vector4(0.06, 0.3, 0.97, 1.0);

    var chrome = withFade(new T.MeshPhysicalMaterial({
      color: 0xdfe6f0, metalness: 1, roughness: 0.13, clearcoat: 0.8, clearcoatRoughness: 0.08,
      envMapIntensity: 1.7, transparent: true
    }));
    var tub = mobile ? 260 : 420, rad = mobile ? 18 : 28, radL = mobile ? 12 : 20;

    group = new T.Group(); scene.add(group);
    for (var i = 0; i < N; i++) {
      var L = 20 + i * 0.9, r = 0.12;
      var curve = bandCurve(L, 0.95);
      var geo = new T.TubeGeometry(curve, tub, r, rad, false); geo.scale(1, 1.55, 0.38);
      var mesh = new T.Mesh(geo, chrome);
      mesh.renderOrder = N - i;                     // de atrás hacia delante
      var lgeo = new T.TubeGeometry(curve, tub, r * 1.04, radL, false); lgeo.scale(1, 1.55, 0.38);
      var lm = lightMat(i % 3 === 1 ? 0x9ef6ff : 0x00e5ff);
      var light = new T.Mesh(lgeo, lm);
      light.renderOrder = 100 + i;
      var g = new T.Group(); g.add(mesh, light);
      g.position.set(i * 0.12, i * 0.62, -i * 0.55);
      group.add(g);
      bands.push({ g: g, lm: lm, head: i * 0.37 - 0.3, speed: 0.11 + (i % 3) * 0.025 });
    }
    group.rotation.set(0.18, -0.32, 0.46);
  }

  function resize() {
    if (!renderer) return;
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
    group.position.x = base.x + s.mx * -0.35;
    group.position.y = base.y + s.my * 0.25 + s.hero * 2.2;
    group.rotation.x = 0.18 + s.my * 0.06 + s.hero * 0.35;
    group.rotation.y = -0.32 + s.mx * 0.08 - s.hero * 0.18;
    group.rotation.z = 0.46 + s.hero * 0.16;
  }

  EV.onda = {
    ok: false,

    /* Carga Three.js y monta la escena. Resuelve true si hay WebGL. */
    load: function (cv) {
      canvas = cv;
      mobile = Math.min(screen.width, screen.height) < 720 || matchMedia('(pointer: coarse)').matches;
      return import(THREE_URL).then(function (mod) {
        T = mod;
        renderer = new T.WebGLRenderer({ canvas: canvas, antialias: true, alpha: true, powerPreference: 'high-performance', preserveDrawingBuffer: false });
        maxDpr = Math.min(window.devicePixelRatio || 1, 2);
        dpr = maxDpr;
        renderer.setPixelRatio(dpr);
        renderer.setClearColor(0x000000, 0);
        renderer.outputColorSpace = T.SRGBColorSpace;
        renderer.toneMapping = T.ACESFilmicToneMapping;
        renderer.toneMappingExposure = 1.3;
        build();
        resize();
        place();
        renderer.compile(scene, camera);
        EV.onda.ok = true;
        return true;
      });
    },

    resize: resize,

    /* dt: segundos · inp: { mx, my (−0.5..0.5), hero (0..1), luz (bool) } */
    render: function (dt, inp) {
      if (!renderer) return;
      resize();
      var k = 1 - Math.pow(1 - 0.05, dt * 60);     // lerp 0.05 a 60 fps
      var kh = 1 - Math.pow(1 - 0.08, dt * 60);
      s.mx += (inp.mx - s.mx) * k;
      s.my += (inp.my - s.my) * k;
      s.hero += (inp.hero - s.hero) * kh;
      place();
      for (var i = 0; i < bands.length; i++) {
        var b = bands[i];
        if (inp.luz) {
          // La luz avanza integrando la velocidad: acelerar no la hace saltar.
          b.head += dt * b.speed * (1 + s.hero * 1.6);
          if (b.head > 1.3) b.head -= 1.6;
          b.lm.uniforms.uHead.value = b.head;
          b.g.position.z = -i * 0.55 + Math.sin(performance.now() / 1000 * 0.35 + i * 0.7) * 0.06;
        } else b.lm.uniforms.uHead.value = -2;
      }
      renderer.render(scene, camera);

      // Calidad adaptativa: si los fotogramas pasan de ~22 ms, baja el dpr.
      if (dt > 0.022 && dt < 0.25) slow += dt; else slow = Math.max(0, slow - dt * 0.5);
      if (slow > 1.2 && dpr > 1) {
        dpr = Math.max(1, dpr - 0.5); slow = 0;
        renderer.setPixelRatio(dpr); w = h = 0; resize();
      }
    },

    /* Fotograma fijo (sin luces) para la versión fija: PNG con transparencia. */
    capture: function () {
      s.mx = s.my = s.hero = 0; place();
      bands.forEach(function (b, i) { b.lm.uniforms.uHead.value = -2; b.g.position.z = -i * 0.55; });
      renderer.render(scene, camera);
      return canvas.toDataURL('image/png');
    },

    get dpr() { return dpr; }
  };
})();
