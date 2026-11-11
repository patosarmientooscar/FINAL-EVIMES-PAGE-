/* ==========================================================================
   pano.js — salas en panorama 360° (Three.js, un solo renderer).

   - Esfera SphereGeometry(50, 96, 48) vista desde dentro (scale -1,1,1),
     MeshBasicMaterial sin tone mapping, renderOrder -1.
   - Texturas: 'previa' (2048) primero y luego la grande — 'alta' (5792) en
     escritorio si maxTextureSize ≥ 8192, si no 'media' (4096) — con fundido.
   - Carga progresiva: se carga la sala activa y la siguiente; las que quedan
     a 2 o más zonas se liberan (dispose).
   - Cámara: la sala define paradas { yaw, pitch, fov, hold } en config.js;
     la cámara va de una a otra con power2.inOut y se queda quieta en cada
     una. pitch += sin(p·2π)·2°. fov 55 en escritorio, 70 en vertical.
     La costura del panorama (±180°) nunca entra en cuadro: cada parada se
     limita según el fov real de la pantalla.
   - Anclas (yaw, pitch) → cartelas; 4 esquinas → pantallas HTML con matrix3d
     proyectadas con LA MISMA cámara que dibuja la esfera: no bailan.
   - Última parada: "entrar en la pantalla" (el fov se cierra hasta que la
     pantalla llena el encuadre y pasa a ser una página a pantalla completa).
   - Transición entre salas: desenfoque creciente (cristal esmerilado) +
     fundido a navy. Sin flashes.
   - dpr ≤ 2 (baja a 1 si el render va por debajo de 40 fps). Solo se dibuja
     si la sala está activa y algo cambió.
   - Modo fijo: una imagen plana por parada y las cartelas en lista.
   - ?ajustar=sala: arrastra para mirar, rueda = fov, clic = copia (yaw, pitch).
   ========================================================================== */
(function () {
  var EV = (window.EV = window.EV || {});
  var CONF = window.EVIMES_CONFIG || {};
  var SALAS = CONF.salas || {};
  var PARAM = new URLSearchParams(location.search).get('ajustar');
  var D2R = Math.PI / 180;
  var SCRUB = 1.5;            // s que tarda la cámara en alcanzar el scroll (como scrub: 1.5)
  var LERP = 0.05;            // suavizado extra por fotograma a 60 fps (independiente del frame rate)
  var T_IN = 0.08;            // 0 → T_IN: la sala aparece (desenfoque → nítido)
  var T_ENTER = 0.78;         // última parada → entrar en la pantalla
  var T_FULL = 0.88;          // la pantalla ya es una página a pantalla completa
  var T_OUT = 0.965;          // fundido a la zona siguiente
  var SEAM = 4;               // grados de margen con la costura (±180°)

  var T = null;
  var renderer = null, scene = null, camera = null, geo = null, canvas = null, post = null;
  var rooms = {};
  var activeId = null;
  var view = { w: 1, h: 1, dpr: 1 };
  var maxTex = 4096;
  var perf = { n: 0, sum: 0, low: false, last: 0 };
  var still = EV.mode !== 'cine';
  var tmpV = null;

  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function range(p, a, b) { return clamp((p - a) / (b - a), 0, 1); }
  function p2io(t) { return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2; }
  function smooth(a, b, x) { var t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); }
  function variant() { return EV.stage.variant(); }

  /* yaw 0 = centro del equirectangular, + a la derecha; pitch + arriba. */
  function dirOf(yaw, pitch, out) {
    var y = yaw * D2R, p = pitch * D2R;
    return out.set(-Math.cos(y) * Math.cos(p), Math.sin(p), -Math.sin(y) * Math.cos(p));
  }
  function anglesOf(v) {
    var len = v.length() || 1;
    return [Math.atan2(-v.z, -v.x) / D2R, Math.asin(clamp(v.y / len, -1, 1)) / D2R];
  }

  /* ---------- renderer ---------- */
  function init(c) {
    T = window.THREE;
    canvas = c;
    if (!T) { console.warn('[pano] Three.js no cargó: salas en modo lista.'); return false; }
    try {
      renderer = new T.WebGLRenderer({ canvas: c, antialias: false, alpha: false, powerPreference: 'high-performance' });
    } catch (e) { console.warn('[pano] sin WebGL', e); renderer = null; return false; }
    // Sin conversiones de color: los bytes del JPEG llegan tal cual a pantalla.
    renderer.outputColorSpace = T.LinearSRGBColorSpace;
    renderer.toneMapping = T.NoToneMapping;
    renderer.setClearColor(0x080b14, 1);
    maxTex = renderer.capabilities.maxTextureSize || 4096;
    scene = new T.Scene();
    camera = new T.PerspectiveCamera(55, 1, 0.1, 200);
    geo = new T.SphereGeometry(50, 96, 48);
    geo.scale(-1, 1, 1);
    tmpV = new T.Vector3();
    resize();
    window.addEventListener('resize', resize);
    EV.stage.onVariant(function () { for (var id in rooms) rebuild(rooms[id]); });
    return true;
  }

  function resize() {
    if (!renderer) return;
    view.w = canvas.clientWidth || window.innerWidth;
    view.h = canvas.clientHeight || window.innerHeight;
    view.dpr = perf.low ? 1 : Math.min(2, window.devicePixelRatio || 1);
    renderer.setPixelRatio(view.dpr);
    renderer.setSize(view.w, view.h, false);
    camera.aspect = view.w / view.h;
    camera.updateProjectionMatrix();
    for (var id in rooms) rebuild(rooms[id]);
  }

  /* ---------- postproceso: desenfoque de cristal esmerilado ---------- */
  var VS = 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }';
  var FS_BLUR = [
    'uniform sampler2D tMap; uniform vec2 uDir; varying vec2 vUv;',
    'void main(){',
    '  vec2 o1 = uDir * 1.411764705882353, o2 = uDir * 3.2941176470588234, o3 = uDir * 5.176470588235294;',
    '  vec4 c = texture2D(tMap, vUv) * 0.1964825501511404;',
    '  c += (texture2D(tMap, vUv + o1) + texture2D(tMap, vUv - o1)) * 0.2969069646728344;',
    '  c += (texture2D(tMap, vUv + o2) + texture2D(tMap, vUv - o2)) * 0.09447039785044732;',
    '  c += (texture2D(tMap, vUv + o3) + texture2D(tMap, vUv - o3)) * 0.010381362401148057;',
    '  gl_FragColor = c;',
    '}'].join('\n');
  var FS_COMP = 'uniform sampler2D tMap; uniform float uAlpha; varying vec2 vUv; void main(){ gl_FragColor = vec4(texture2D(tMap, vUv).rgb, uAlpha); }';

  function makePost() {
    var o = { depthBuffer: false, stencilBuffer: false };
    var p = {
      a: new T.WebGLRenderTarget(4, 4, o), b: new T.WebGLRenderTarget(4, 4, o),
      qs: new T.Scene(), qc: new T.OrthographicCamera(-1, 1, 1, -1, 0, 1), w: 0, h: 0
    };
    p.blur = new T.ShaderMaterial({ uniforms: { tMap: { value: null }, uDir: { value: new T.Vector2() } }, vertexShader: VS, fragmentShader: FS_BLUR, depthTest: false, depthWrite: false });
    p.comp = new T.ShaderMaterial({ uniforms: { tMap: { value: null }, uAlpha: { value: 1 } }, vertexShader: VS, fragmentShader: FS_COMP, transparent: true, depthTest: false, depthWrite: false });
    p.quad = new T.Mesh(new T.PlaneGeometry(2, 2), p.blur);
    p.quad.frustumCulled = false;
    p.qs.add(p.quad);
    return p;
  }

  function draw(blur) {
    renderer.setRenderTarget(null);
    renderer.render(scene, camera);
    if (blur <= 0.002) return;
    if (!post) post = makePost();
    var qw = Math.max(2, Math.round(view.w * view.dpr / 4)), qh = Math.max(2, Math.round(view.h * view.dpr / 4));
    if (qw !== post.w || qh !== post.h) { post.a.setSize(qw, qh); post.b.setSize(qw, qh); post.w = qw; post.h = qh; }
    renderer.setRenderTarget(post.a);
    renderer.render(scene, camera);
    post.quad.material = post.blur;
    var step = 0.5 + blur * 2.6;
    for (var i = 0; i < 3; i++) {
      post.blur.uniforms.tMap.value = post.a.texture; post.blur.uniforms.uDir.value.set(step / qw, 0);
      renderer.setRenderTarget(post.b); renderer.render(post.qs, post.qc);
      post.blur.uniforms.tMap.value = post.b.texture; post.blur.uniforms.uDir.value.set(0, step / qh);
      renderer.setRenderTarget(post.a); renderer.render(post.qs, post.qc);
      step *= 1.7;
    }
    renderer.setRenderTarget(null);
    post.quad.material = post.comp;
    post.comp.uniforms.tMap.value = post.a.texture;
    post.comp.uniforms.uAlpha.value = smooth(0, 0.3, blur);
    var ac = renderer.autoClear;
    renderer.autoClear = false;
    renderer.render(post.qs, post.qc);
    renderer.autoClear = ac;
  }

  /* ---------- texturas ---------- */
  function texFrom(src, flipped) {
    var t = new T.Texture(src);
    t.flipY = !flipped;
    t.colorSpace = T.NoColorSpace;
    t.wrapS = T.RepeatWrapping;
    t.minFilter = T.LinearMipmapLinearFilter;
    t.magFilter = T.LinearFilter;
    t.generateMipmaps = true;
    t.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
    t.needsUpdate = true;
    return t;
  }
  function loadTex(url) {
    return fetch(url).then(function (r) { if (!r.ok) throw new Error(r.status + ' ' + url); return r.blob(); })
      .then(function (b) {
        if (!window.createImageBitmap) throw new Error('sin createImageBitmap');
        return createImageBitmap(b, { imageOrientation: 'flipY' }).then(function (bmp) { return { tex: texFrom(bmp, true), src: bmp, flipped: true }; });
      })
      .catch(function () {
        return new Promise(function (res, rej) {
          var img = new Image();
          img.onload = function () { res({ tex: texFrom(img, false), src: img, flipped: false }); };
          img.onerror = rej;
          img.src = url;
        });
      });
  }

  /* ---------- sala ---------- */
  function bigKey() {
    return variant() === 'desktop' && maxTex >= 8192 ? 'alta' : 'media';
  }

  function setMesh(room, which, res) {
    var mat = new T.MeshBasicMaterial({ map: res.tex, toneMapped: false, depthTest: false, depthWrite: false, transparent: which === 'full', opacity: which === 'full' ? 0 : 1 });
    var mesh = new T.Mesh(geo, mat);
    mesh.renderOrder = which === 'full' ? -1 : -2;
    if (which === 'full') mesh.scale.setScalar(0.98);
    mesh.visible = activeId === room.id;
    mesh.frustumCulled = false;
    scene.add(mesh);
    room.mesh[which] = mesh;
    room.dirty = true;
    return mesh;
  }

  function lumaFrom(room, res) {
    try {
      var gw = 128, gh = 64;
      var c = document.createElement('canvas'); c.width = gw; c.height = gh;
      var x = c.getContext('2d', { willReadFrequently: true });
      x.drawImage(res.src, 0, 0, gw, gh);
      var d = x.getImageData(0, 0, gw, gh).data, g = new Float32Array(gw * gh);
      var lin = function (v) { v /= 255; return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
      for (var i = 0; i < gw * gh; i++) g[i] = 0.2126 * lin(d[i * 4]) + 0.7152 * lin(d[i * 4 + 1]) + 0.0722 * lin(d[i * 4 + 2]);
      room.luma = { w: gw, h: gh, g: g, flipped: res.flipped };
    } catch (e) { room.luma = null; }
  }

  function load(room) {
    if (!renderer || room.loading) return;
    room.loading = true;
    var urls = room.cfg.pano;
    var bk = still ? 'media' : bigKey();
    var gotPrev = still ? Promise.resolve(null) : loadTex(urls.previa).then(function (res) {
      if (!room.loading) { res.tex.dispose(); return; }
      if (!room.mesh.full) setMesh(room, 'prev', res);
      lumaFrom(room, res);
      if (room.resolveReady) room.resolveReady();
    }).catch(function (e) { console.warn('[pano] previa', e); });
    gotPrev.then(function () { return loadTex(urls[bk] || urls.media); }).then(function (res) {
      if (!room.loading) { res.tex.dispose(); return; }
      renderer.initTexture(res.tex);       // sube a la GPU ya, no en mitad del giro
      var mesh = setMesh(room, 'full', res);
      if (!room.luma) lumaFrom(room, res);
      if (room.resolveReady) room.resolveReady();
      if (still) { mesh.material.opacity = 1; mesh.material.transparent = false; buildStills(room); return; }
      gsap.to(mesh.material, {
        opacity: 1, duration: 0.8, ease: 'power1.inOut',
        onUpdate: function () { room.dirty = true; },
        onComplete: function () {
          mesh.material.transparent = false;
          dropMesh(room, 'prev');
          room.dirty = true;
        }
      });
    }).catch(function (e) { console.warn('[pano] textura', e); });
  }

  function dropMesh(room, which) {
    var m = room.mesh[which];
    if (!m) return;
    scene.remove(m);
    if (m.material.map) {
      var img = m.material.map.image;
      m.material.map.dispose();
      if (img && img.close) img.close();
    }
    m.material.dispose();
    room.mesh[which] = null;
  }
  function release(room) {
    if (!room.loading) return;
    room.loading = false;
    dropMesh(room, 'prev');
    dropMesh(room, 'full');
    room.luma = null;
  }

  function manageLoads() {
    if (!renderer) return;
    var a = EV.zones.get(activeId);
    if (!a) return;
    for (var id in rooms) {
      var r = rooms[id], d = r.index - a.index;
      if (d === 0 || d === 1 || d === -1) load(r);
      else if (Math.abs(d) >= 2) release(r);
    }
  }

  /* ---------- paradas y recorrido ---------- */
  function fovFor(s) {
    var mob = variant() === 'mobile';
    if (mob && s.m && s.m.fov) return s.m.fov;
    return mob ? 70 : (s.fov || 55);
  }

  /* Media apertura horizontal real (grados) para un pitch y un fov dados. */
  function halfYaw(pitch, fov) {
    var tv = Math.tan(fov * D2R / 2), th = tv * view.w / view.h, p = pitch * D2R;
    var den = Math.cos(p) - tv * Math.abs(Math.sin(p));
    return den > 0.05 ? Math.atan2(th, den) / D2R : 90;
  }
  function guardYaw(room, yaw, pitch, fov) {
    var d = halfYaw(pitch, fov);
    var lim = room.cfg.yawLimite || [-180, 180];
    var lo = Math.max(lim[0], -180 + SEAM + d), hi = Math.min(lim[1], 180 - SEAM - d);
    return lo > hi ? (lo + hi) / 2 : clamp(yaw, lo, hi);
  }

  function stopFor(room, s) {
    var mob = variant() === 'mobile' && s.m ? s.m : {};
    var pitch = mob.pitch != null ? mob.pitch : s.pitch;
    var fov = fovFor(s);
    var yaw = guardYaw(room, mob.yaw != null ? mob.yaw : s.yaw, pitch, fov);
    return { id: s.id, yaw: yaw, pitch: pitch, fov: fov, hold: s.hold || 1 };
  }

  function rebuild(room) {
    var stops = room.cfg.paradas.map(function (s) { return stopFor(room, s); });
    var segs = [], total = 0;
    stops.forEach(function (s, i) {
      if (i > 0) {
        var a = stops[i - 1];
        var wgt = 0.55 + Math.abs(s.yaw - a.yaw) / 80 + Math.abs(s.pitch - a.pitch) / 60;
        segs.push({ type: 'move', a: i - 1, b: i, w: wgt }); total += wgt;
      }
      segs.push({ type: 'hold', a: i, w: s.hold }); total += s.hold;
    });
    var t = T_IN;
    segs.forEach(function (sg) { sg.t0 = t; t += sg.w / total * (T_ENTER - T_IN); sg.t1 = t; });
    // Ventana de cada parada (para cartelas): su quietud ± un tercio de los viajes vecinos.
    var win = {};
    segs.forEach(function (sg, k) {
      if (sg.type !== 'hold') return;
      var prev = segs[k - 1], next = segs[k + 1];
      var a = prev ? sg.t0 - (prev.t1 - prev.t0) * 0.3 : T_IN * 0.6;
      var b = next ? sg.t1 + (next.t1 - next.t0) * 0.3 : T_ENTER;
      win[stops[sg.a].id] = [a, b, sg.t0, sg.t1];
    });
    room.tl = { stops: stops, segs: segs, win: win };
    room.enterTarget = null;
    room.dirty = true;
  }

  function lerpCam(a, b, t) {
    var ta = Math.log(Math.tan(a.fov * D2R / 2)), tb = Math.log(Math.tan(b.fov * D2R / 2));
    return {
      yaw: a.yaw + (b.yaw - a.yaw) * t,
      pitch: a.pitch + (b.pitch - a.pitch) * t,
      fov: 2 * Math.atan(Math.exp(ta + (tb - ta) * t)) / D2R
    };
  }

  /* Cámara que mete la pantalla "entrar" a sangre en el encuadre. */
  function enterTarget(room) {
    if (room.enterTarget) return room.enterTarget;
    var s = room.cfg.pantallas && room.cfg.pantallas.filter(function (x) { return x.entrar; })[0];
    if (!s) return null;
    var c = s.esquinas;
    var yaw = c.reduce(function (m, q) { return m + q[0]; }, 0) / 4;
    var pitch = c.reduce(function (m, q) { return m + q[1]; }, 0) / 4;
    var halfH = (Math.max.apply(null, c.map(function (q) { return q[1]; })) - Math.min.apply(null, c.map(function (q) { return q[1]; }))) / 2;
    var halfW = (Math.max.apply(null, c.map(function (q) { return q[0]; })) - Math.min.apply(null, c.map(function (q) { return q[0]; }))) / 2 * Math.cos(pitch * D2R);
    var aspect = view.w / view.h;
    var v = 2 * Math.min(halfH, Math.atan(Math.tan(halfW * D2R) / aspect) / D2R) * 0.96;
    room.enterTarget = { yaw: yaw, pitch: pitch, fov: v };
    return room.enterTarget;
  }

  function cameraAt(room, p) {
    var tl = room.tl, st = null;
    var stops = tl.stops;
    if (p <= tl.segs[0].t0) st = stops[0];
    else if (p >= T_ENTER) st = stops[stops.length - 1];
    else {
      for (var i = 0; i < tl.segs.length; i++) {
        var sg = tl.segs[i];
        if (p <= sg.t1) {
          if (sg.type === 'hold') st = stops[sg.a];
          else st = lerpCam(stops[sg.a], stops[sg.b], p2io(range(p, sg.t0, sg.t1)));
          break;
        }
      }
      if (!st) st = stops[stops.length - 1];
    }
    var out = { yaw: st.yaw, pitch: st.pitch, fov: st.fov };
    var k = 0;
    var et = p > T_ENTER ? enterTarget(room) : null;
    if (et) {
      k = p2io(range(p, T_ENTER, T_FULL));
      out = lerpCam(out, et, k);
    }
    out.pitch += Math.sin(p * Math.PI * 2) * 2 * (1 - k);
    if (!et || k < 1) out.yaw = guardYaw(room, out.yaw, out.pitch, out.fov);
    return out;
  }

  function setCamera(c) {
    if (Math.abs(camera.fov - c.fov) > 1e-6) { camera.fov = c.fov; camera.updateProjectionMatrix(); }
    camera.up.set(0, 1, 0);
    camera.lookAt(dirOf(c.yaw, c.pitch, tmpV));
    camera.updateMatrixWorld(true);
  }

  /* Proyección de una dirección (yaw, pitch) a px de pantalla. */
  var pv = null;
  function project(yaw, pitch) {
    if (!pv) pv = new T.Vector3();
    dirOf(yaw, pitch, pv).applyMatrix4(camera.matrixWorldInverse);
    if (pv.z > -1e-3) return null;
    pv.applyMatrix4(camera.projectionMatrix);
    return [(pv.x + 1) / 2 * view.w, (1 - pv.y) / 2 * view.h];
  }
  function unproject(x, y) {
    var v = new T.Vector3(x / view.w * 2 - 1, 1 - y / view.h * 2, 0.5).unproject(camera);
    return anglesOf(v);
  }

  /* Efectos de entrada/salida de la sala: desenfoque y fundido a navy. */
  function fxAt(room, p) {
    var blurIn = 1 - smooth(0, T_IN, p);
    var navyIn = 1 - smooth(0, T_IN * 0.7, p);
    var blurOut = 0, navyOut = 0;
    if (!room.enter) { blurOut = smooth(T_OUT - 0.02, 1, p); navyOut = smooth(T_OUT, 1, p); }
    return { blur: Math.max(blurIn, blurOut), navy: Math.max(navyIn, navyOut) };
  }

  /* ---------- tick de la sala ---------- */
  function renderRoom(room, pRaw, active) {
    if (!active || !renderer || !room.tl || still) return;
    // Suavizado: como un scrub de 1.5 s y, encima, un lerp por fotograma.
    if (Math.abs(pRaw - room.target) > 1e-6) {
      room.target = pRaw;
      gsap.to(room, { sp: pRaw, duration: SCRUB, ease: 'power3.out', overwrite: true });
    }
    var k = 1 - Math.pow(1 - LERP, gsap.ticker.deltaRatio(60));
    room.p += (room.sp - room.p) * k;
    if (Math.abs(room.p - room.sp) < 1e-5) room.p = room.sp;

    var p = room.p;
    var c = room.look || cameraAt(room, p);
    var fx = room.look ? { blur: 0, navy: 0 } : fxAt(room, p);
    room.fx = fx;
    room.cam = c;
    // Con la página a pantalla completa delante, no hace falta dibujar.
    var hidden = room.enter && p > T_FULL + 0.012 && !room.look;
    var keyS = c.yaw.toFixed(4) + ',' + c.pitch.toFixed(4) + ',' + c.fov.toFixed(4) + ',' + fx.blur.toFixed(3) + (hidden ? 'h' : '');
    room.key = keyS;
    setCamera(c);
    canvas.style.opacity = (1 - fx.navy).toFixed(3);
    if (hidden || (keyS === room.lastKey && !room.dirty)) return;
    room.lastKey = keyS;
    room.dirty = false;
    var t0 = performance.now();
    draw(fx.blur);
    watchPerf(performance.now() - t0);
  }

  /* Si el render va lento de verdad (< 40 fps sostenidos), dpr a 1. */
  function watchPerf() {
    var now = performance.now();
    if (perf.last && now - perf.last < 200) {
      perf.sum += now - perf.last; perf.n++;
      if (perf.n >= 90) {
        if (!perf.low && perf.sum / perf.n > 25 && view.dpr > 1) { perf.low = true; resize(); }
        perf.n = 0; perf.sum = 0;
      }
    }
    perf.last = now;
  }

  function luminanceUnder(room, rect) {
    var L = room.luma;
    if (!L || !room.cam) return null;
    var s = 0, n = 0;
    for (var iy = 0; iy < 3; iy++) for (var ix = 0; ix < 4; ix++) {
      var x = rect.left + rect.width * (ix + 0.5) / 4, y = rect.top + rect.height * (iy + 0.5) / 3;
      var a = unproject(x, y);
      var u = ((a[0] / 360 + 0.5) % 1 + 1) % 1, v = 0.5 - a[1] / 180;
      if (L.flipped) v = 1 - v;
      var gx = clamp(Math.floor(u * L.w), 0, L.w - 1), gy = clamp(Math.floor(v * L.h), 0, L.h - 1);
      s += L.g[gy * L.w + gx]; n++;
    }
    return n ? s / n : null;
  }

  /* ---------- capas HTML de la sala ---------- */
  function contentAt(path) { return EV.util.content(path); }

  function stageLayer(room) {
    var d = document.createElement('div');
    d.className = 'layer-sala';
    room.zone.stage.appendChild(d);
    return d;
  }

  function webContent(s, parent) {
    // Captura real si existe; iframe solo si la web permite incrustarse; si no, aviso honesto.
    if (s.captura) {
      var img = new Image();
      img.alt = '';
      img.className = 'web__captura';
      img.decoding = 'async';
      img.src = s.captura;
      parent.appendChild(img);
      return img;
    }
    if (s.iframe && s.url) {
      var f = document.createElement('iframe');
      f.src = s.url;
      f.title = s.nombre;
      f.loading = 'lazy';
      f.tabIndex = -1;
      f.className = 'web__iframe';
      parent.appendChild(f);
      return f;
    }
    var ph = document.createElement('div');
    ph.className = 'web-pendiente';
    ph.innerHTML = '<p class="web-pendiente__url"></p><p class="web-pendiente__nota">Captura pendiente en assets/screens/</p>';
    ph.querySelector('.web-pendiente__url').textContent = s.nombre;
    parent.appendChild(ph);
    return ph;
  }

  function buildLayers(room) {
    var cfg = room.cfg, layer = room.layer = stageLayer(room);
    var prog = function () { return room.p; };
    var fade = function () { return room.fx ? 1 - smooth(0, 0.35, room.fx.blur) : 0; };

    // Rótulo de vinilo en el cristal.
    if (cfg.rotulo) {
      var r = document.createElement('div');
      r.className = 'vinilo';
      r.setAttribute('aria-hidden', 'true');
      var key = room.textKey;
      r.innerHTML = '<span></span>';
      r.querySelector('span').textContent = contentAt(key + '.rotulo') || '';
      layer.appendChild(r);
      EV.overlay.screenQuad(r, {
        zone: room.id, progress: prog,
        points: function () { return quadPts(cfg.rotulo.esquinas); },
        opacity: fade
      });
    }

    // Pantallas con webs reales.
    (cfg.pantallas || []).forEach(function (s) {
      var el = document.createElement('div');
      el.className = 'pantalla';
      el.setAttribute('aria-hidden', 'true');
      webContent(s, el);
      layer.appendChild(el);
      EV.overlay.screenQuad(el, {
        zone: room.id, progress: prog,
        points: function () { return quadPts(s.esquinas); },
        opacity: function (p) {
          var o = fade();
          if (s.entrar) o *= 1 - smooth(T_FULL - 0.012, T_FULL + 0.004, room.p);
          return o;
        }
      });
      if (s.entrar) buildPage(room, s);
    });

    // Cartelas en sus objetos.
    var win = function (id) { return room.tl.win[id] || [0, 0]; };
    (cfg.anclas || []).forEach(function (a) {
      var data = contentAt(a.c);
      var main = a.principal && data && typeof data === 'object';
      var w0 = win(a.parada);
      var cartela = EV.overlay.cartela({
        zone: room.id, parent: layer,
        range: [w0[0], w0[1]],
        objeto: main ? null : data,
        texto: main ? data.texto : null,
        tecnica: main ? data.tecnica : null,
        side: a.lado || 'auto',
        anchor: function () { return fade() > 0.5 ? project(a.yaw, a.pitch) : null; },
        progress: prog,
        rangeFn: function () { var q = win(a.parada); return [q[0], q[1]]; }
      });
      if (main) cartela.classList.add('cartela--principal');
    });

    if (EV.growth && cfg.luces) EV.growth.mount(room, layer, { project: project, win: win, progress: prog, fade: fade });
  }

  function quadPts(c) {
    var out = [];
    for (var i = 0; i < 4; i++) {
      var q = project(c[i][0], c[i][1]);
      if (!q) return null;
      out.push(q);
    }
    return out;
  }

  /* La pantalla "entrar" se convierte en una página a pantalla completa
     con scroll interno (ligado al scroll de la sala). */
  function buildPage(room, s) {
    var page = document.createElement('div');
    page.className = 'pagina';
    page.setAttribute('aria-hidden', 'true');
    var inner = document.createElement('div');
    inner.className = 'pagina__contenido';
    var content = webContent(s, inner);
    page.appendChild(inner);
    room.zone.stage.appendChild(page);
    var wO = null, wT = null, lastO = '', lastT = '';
    room.page = { el: page, inner: inner, content: content };
    room.pageUpdate = function () {
      var p = room.p;
      var o = smooth(T_FULL - 0.014, T_FULL + 0.002, p) * (1 - smooth(T_OUT, 1, p));
      var os = o.toFixed(3);
      if (os !== lastO) { lastO = os; page.style.opacity = os; page.style.visibility = o > 0.001 ? 'visible' : 'hidden'; }
      var maxY = Math.max(0, inner.scrollHeight - window.innerHeight);
      var y = -maxY * p2io(range(p, T_FULL + 0.01, T_OUT - 0.004));
      var ts = 'translate3d(0,' + y.toFixed(1) + 'px,0)';
      if (ts !== lastT) { lastT = ts; inner.style.transform = ts; }
    };
  }

  /* ---------- modo fijo: una imagen por parada + cartelas en lista ---------- */
  function buildStills(room) {
    if (room.stillsBuilt) return;
    room.stillsBuilt = true;
    var list = room.stillList;
    if (!list) return;
    var mob = variant() === 'mobile';
    var W = Math.min(1600, Math.round((list.clientWidth || window.innerWidth) * Math.min(2, window.devicePixelRatio || 1)));
    var H = Math.round(W * (mob ? 1.15 : 0.5625));
    renderer.setPixelRatio(1);
    renderer.setSize(W, H, false);
    camera.aspect = W / H;
    camera.updateProjectionMatrix();
    room.mesh.full.visible = true;
    list.querySelectorAll('[data-parada]').forEach(function (fig) {
      var s = room.tl.stops.filter(function (x) { return x.id === fig.dataset.parada; })[0];
      if (!s) return;
      setCamera({ yaw: guardYaw(room, s.yaw, s.pitch, s.fov), pitch: s.pitch, fov: s.fov });
      renderer.render(scene, camera);
      var c = document.createElement('canvas');
      c.width = W; c.height = H;
      c.getContext('2d').drawImage(renderer.domElement, 0, 0, W, H);
      c.className = 'parada__img';
      c.setAttribute('aria-hidden', 'true');
      fig.insertBefore(c, fig.firstChild);
    });
    room.mesh.full.visible = false;
    resize();
    renderer.setRenderTarget(null);
    renderer.clear();
  }

  function buildStillList(room) {
    var cfg = room.cfg;
    var list = document.createElement('div');
    list.className = 'paradas';
    var byStop = {};
    (cfg.anclas || []).forEach(function (a) { (byStop[a.parada] = byStop[a.parada] || []).push(a); });
    cfg.paradas.forEach(function (s) {
      var items = byStop[s.id] || [];
      if (!items.length) return;
      var fig = document.createElement('figure');
      fig.className = 'parada';
      fig.dataset.parada = s.id;
      var cap = document.createElement('figcaption');
      var ul = document.createElement('ul');
      ul.className = 'parada__lista';
      items.forEach(function (a) {
        var data = contentAt(a.c);
        var li = document.createElement('li');
        if (data && typeof data === 'object') {
          li.className = 'parada__texto';
          li.innerHTML = '<p></p><p class="parada__tecnica"></p>';
          li.firstChild.textContent = data.texto;
          li.lastChild.textContent = data.tecnica;
        } else li.textContent = data;
        ul.appendChild(li);
      });
      cap.appendChild(ul);
      fig.appendChild(cap);
      list.appendChild(fig);
    });
    room.zone.stage.appendChild(list);
    room.stillList = list;
  }

  /* ---------- ?ajustar=sala ---------- */
  function adjustTool(room) {
    var ui = document.createElement('div');
    ui.className = 'sala-ajuste';
    ui.setAttribute('data-lenis-prevent', '');
    ui.innerHTML =
      '<div class="sala-ajuste__mira" aria-hidden="true"></div>' +
      '<svg class="sala-ajuste__marcas" aria-hidden="true"></svg>' +
      '<div class="ajuste__panel" role="region" aria-label="Ajuste de sala">' +
      '<p class="ajuste__titulo">Sala · ' + room.cfg.label + '</p>' +
      '<pre class="ajuste__json" data-cam></pre>' +
      '<pre class="ajuste__json" data-clics></pre>' +
      '<p class="ajuste__estado" data-estado aria-live="polite">Arrastra para mirar · rueda: fov · clic: copia (yaw, pitch) · Esc: volver al scroll</p>' +
      '<div class="ajuste__acciones"><button type="button" data-mirar>Mirar</button><button type="button" data-camara>Copiar cámara</button><button type="button" data-cuatro>Copiar 4 últimos</button></div>' +
      '</div>';
    document.body.appendChild(ui);
    var camEl = ui.querySelector('[data-cam]'), clicsEl = ui.querySelector('[data-clics]'), estado = ui.querySelector('[data-estado]');
    var marks = ui.querySelector('svg');
    var clics = [];
    var on = false, drag = null;
    function f(n) { return n.toFixed(1); }
    function copy(t, msg) {
      if (navigator.clipboard) navigator.clipboard.writeText(t).then(function () { estado.textContent = msg; }, function () { estado.textContent = 'No se pudo copiar: selecciona el texto.'; });
    }
    function toggle(v) {
      on = v;
      ui.classList.toggle('is-on', on);
      if (on) { room.look = room.look || Object.assign({}, room.cam || { yaw: 0, pitch: 0, fov: 55 }); EV.scroll.stop(); }
      else { room.look = null; EV.scroll.start(); }
      room.dirty = true;
    }
    ui.querySelector('[data-mirar]').addEventListener('click', function () { toggle(!on); });
    ui.querySelector('[data-camara]').addEventListener('click', function () {
      var c = room.look || room.cam;
      copy('yaw: ' + f(c.yaw) + ', pitch: ' + f(c.pitch) + ', fov: ' + f(c.fov), 'Cámara copiada (para una parada).');
    });
    ui.querySelector('[data-cuatro]').addEventListener('click', function () {
      copy('[' + clics.slice(-4).map(function (q) { return '[' + f(q[0]) + ', ' + f(q[1]) + ']'; }).join(', ') + ']', 'Cuatro esquinas copiadas.');
    });
    window.addEventListener('keydown', function (e) { if (e.key === 'Escape' && on) toggle(false); });
    ui.addEventListener('pointerdown', function (e) {
      if (!on || e.target.closest('.ajuste__panel')) return;
      ui.setPointerCapture(e.pointerId);
      drag = { x: e.clientX, y: e.clientY, x0: e.clientX, y0: e.clientY };
    });
    ui.addEventListener('pointermove', function (e) {
      if (!drag || !room.look) return;
      var k = room.look.fov / view.h;
      room.look.yaw -= (e.clientX - drag.x) * k;
      room.look.pitch = clamp(room.look.pitch + (e.clientY - drag.y) * k, -85, 85);
      drag.x = e.clientX; drag.y = e.clientY;
      room.dirty = true;
    });
    ui.addEventListener('pointerup', function (e) {
      if (!drag) return;
      var moved = Math.hypot(e.clientX - drag.x0, e.clientY - drag.y0) > 4;
      drag = null;
      if (moved) return;
      var a = unproject(e.clientX, e.clientY);
      clics.push(a);
      clicsEl.textContent = 'clics: ' + clics.slice(-4).map(function (q) { return '[' + f(q[0]) + ', ' + f(q[1]) + ']'; }).join(' ');
      copy('yaw: ' + f(a[0]) + ', pitch: ' + f(a[1]), 'Copiado: yaw ' + f(a[0]) + ', pitch ' + f(a[1]));
    });
    ui.addEventListener('wheel', function (e) {
      if (!on || !room.look) return;
      e.preventDefault();
      room.look.fov = clamp(room.look.fov * (1 + e.deltaY * 0.001), 15, 100);
      room.dirty = true;
    }, { passive: false });

    gsap.ticker.add(function () {
      var c = room.look || room.cam;
      if (!c || activeId !== room.id) { ui.style.display = 'none'; return; }
      ui.style.display = '';
      var near = Math.abs(c.yaw) + halfYaw(c.pitch, c.fov) > 180 - SEAM;
      camEl.textContent = 'cámara: yaw ' + f(c.yaw) + ' · pitch ' + f(c.pitch) + ' · fov ' + f(c.fov) + (near ? '  ⚠ costura en cuadro' : '');
      // Marcas: anclas, esquinas de pantallas y del rótulo, luces.
      var html = '';
      function mark(q, label) {
        var s = project(q[0], q[1]);
        if (!s) return;
        html += '<g transform="translate(' + s[0].toFixed(1) + ',' + s[1].toFixed(1) + ')"><path d="M-6 0H6M0 -6V6"/><text x="8" y="-6">' + label + '</text></g>';
      }
      (room.cfg.anclas || []).forEach(function (a) { mark([a.yaw, a.pitch], a.parada); });
      (room.cfg.pantallas || []).forEach(function (s) { s.esquinas.forEach(function (q, i) { mark(q, s.id + ' ' + (i + 1)); }); });
      if (room.cfg.rotulo) room.cfg.rotulo.esquinas.forEach(function (q, i) { mark(q, 'rótulo ' + (i + 1)); });
      if (room.cfg.luces) room.cfg.luces.puntos.forEach(function (q) { mark(q, '·'); });
      marks.innerHTML = html;
    });
  }

  /* ---------- API ---------- */
  function room(zone, opts) {
    var cfg = SALAS[zone.cfg.id];
    if (!cfg) return null;
    var r = {
      id: zone.cfg.id, cfg: Object.assign({ label: zone.cfg.label }, cfg), zone: zone, index: zone.index,
      textKey: opts && opts.texto, mesh: {}, p: 0, sp: 0, target: -1, dirty: true, lastKey: '',
      enter: !!(cfg.pantallas || []).filter(function (s) { return s.entrar; }).length
    };
    r.ready = new Promise(function (res) { r.resolveReady = res; });
    rooms[r.id] = r;

    if (renderer) rebuild(r);
    if (still || !renderer) {
      buildStillList(r);
      var h = zone.stage.querySelector('h2.sr-only');
      if (h) { h.classList.remove('sr-only'); h.classList.add('sala__titulo'); }
      if (renderer) load(r);
    } else {
      buildLayers(r);
      if (PARAM === 'sala') adjustTool(r);
    }

    EV.stage.register(r.id, {
      activate: function (on) {
        if (on) {
          activeId = r.id;
          // Al entrar (por scroll o por el Plano) la cámara arranca donde está el scroll.
          r.p = r.sp = r.target = EV.zones.progress(r.id);
          gsap.killTweensOf(r);
          if (r.mesh.prev) r.mesh.prev.visible = true;
          if (r.mesh.full) r.mesh.full.visible = true;
          r.dirty = true;
        } else {
          if (activeId === r.id) activeId = null;
          if (r.mesh.prev) r.mesh.prev.visible = false;
          if (r.mesh.full) r.mesh.full.visible = false;
          if (r.page) r.page.el.style.visibility = 'hidden';
          if (renderer && !activeId) { canvas.style.opacity = '1'; renderer.setRenderTarget(null); renderer.clear(); }
        }
        manageLoads();
      },
      render: function (p, active) {
        renderRoom(r, p, active);
        if (active && r.pageUpdate) r.pageUpdate();
      },
      key: function () { return r.key || ''; },
      luminanceUnder: function (rect) { return luminanceUnder(r, rect); },
      whenReady: function () { return r.ready; },
      invalidate: function () { r.dirty = true; }
    });
    return r;
  }

  // Cuando cambia la zona activa, gestionar cargas también para zonas sin pano.
  document.addEventListener('ev:zone', function (e) {
    if (!rooms[e.detail.id]) { activeId = null; }
    var a = EV.zones.get(e.detail.id);
    if (!a || !renderer) return;
    for (var id in rooms) {
      var r = rooms[id], d = r.index - a.index;
      if (d === 0 || d === 1 || d === -1) load(r);
      else if (Math.abs(d) >= 2) release(r);
    }
    if (!rooms[e.detail.id]) { canvas.style.opacity = '1'; renderer.setRenderTarget(null); renderer.clear(); }
  });

  EV.pano = {
    init: init,
    room: room,
    project: function (y, p) { return project(y, p); },
    unproject: function (x, y) { return unproject(x, y); },
    /* QA: recorre la sala entera y devuelve el yaw más extremo que llega a
       verse en el borde del encuadre (debe quedar lejos de ±180°). */
    seamCheck: function (id) {
      var r = rooms[id], worst = { edge: 0, p: 0 };
      for (var p = 0; p <= T_FULL; p += 0.0025) {
        var c = cameraAt(r, p);
        var e = Math.max(Math.abs(c.yaw + halfYaw(c.pitch, c.fov)), Math.abs(c.yaw - halfYaw(c.pitch, c.fov)));
        if (e > worst.edge) worst = { edge: +e.toFixed(2), p: +p.toFixed(4), yaw: +c.yaw.toFixed(2), fov: +c.fov.toFixed(1) };
      }
      return worst;
    },
    camera: function (id) { var r = rooms[id || activeId]; return r && r.cam ? Object.assign({ p: r.p }, r.cam) : null; },
    rooms: rooms,
    times: { T_IN: T_IN, T_ENTER: T_ENTER, T_FULL: T_FULL, T_OUT: T_OUT }
  };
})();
