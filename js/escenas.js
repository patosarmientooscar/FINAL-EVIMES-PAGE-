/* ==========================================================================
   escenas.js — arranque escalonado de las escenas Three.js (fix TBT).
   Script clásico, antes de onda.js; los módulos (bento, trabajo selecto) lo
   leen de window.EV.gpu (y tienen su propio respaldo si no está).
   · cede(): devuelve el hilo al navegador entre dos trozos de trabajo
     (scheduler.yield si existe; si no, un setTimeout 0).
   · turno(fn, prio): UNA escena se crea cada vez, nunca dos inits en la
     misma tarea. Mayor prioridad primero (la onda del hero = 10).
   · listo(renderer, mats): espera sin bloquear a que los programas de esos
     materiales estén compilados (KHR_parallel_shader_compile, como
     renderer.compileAsync, pero para materiales sueltos).
   · sinEsperas(renderer): checkShaderErrors = false (lo que Three.js recomienda
     en producción): sin getProgramInfoLog/getShaderInfoLog síncronos en el
     primer uso de cada programa (esperaban a que la GPU vaciara su cola).
   · pmrem(T, renderer, textura): el mismo PMREMGenerator.fromEquirectangular
     de siempre (mismo resultado), con sus dos shaders compilados antes en
     paralelo: así el render del PMREM ya no espera a la compilación.
     Usa tres métodos internos de PMREMGenerator: Three.js está fijado a 0.160.0.
   ========================================================================== */
(function () {
  var EV = (window.EV = window.EV || {});

  function cede() {
    if (window.scheduler && typeof scheduler.yield === 'function') return scheduler.yield();
    return new Promise(function (r) { setTimeout(r, 0); });
  }

  var cola = [], ocupado = false, n = 0;
  function siguiente() {
    if (ocupado || !cola.length) return;
    cola.sort(function (a, b) { return b.prio - a.prio || a.n - b.n; });
    var t = cola.shift();
    ocupado = true;
    var fin = function () { ocupado = false; cede().then(siguiente); };
    Promise.resolve().then(t.fn).then(function (v) { t.ok(v); fin(); }, function (e) { t.ko(e); fin(); });
  }
  function turno(fn, prio) {
    return new Promise(function (ok, ko) { cola.push({ fn: fn, prio: prio || 0, n: n++, ok: ok, ko: ko }); siguiente(); });
  }

  function listo(renderer, mats) {
    return new Promise(function (r) {
      (function mira() {
        var todos = mats.every(function (m) {
          var p = m && renderer.properties.get(m).currentProgram;
          return !p || p.isReady();
        });
        if (todos) r(); else setTimeout(mira, 10);
      })();
    });
  }

  function pmrem(T, renderer, tex) {
    var pm = new T.PMREMGenerator(renderer);
    pm._setSize(tex.image.width / 4);           // lo mismo que hace fromEquirectangular
    var rt = pm._allocateTargets();             // crea el material de desenfoque (y su objetivo de ida y vuelta)
    // Compilar con un objetivo del PMREM puesto: el programa sale igual que el del render
    // (salida lineal, sin tone mapping); con el canvas puesto sería otro y se recompilaría.
    var antes = renderer.getRenderTarget();
    renderer.setRenderTarget(rt);
    pm._compileMaterial(pm._blurMaterial);
    pm.compileEquirectangularShader();
    renderer.setRenderTarget(antes);
    rt.dispose();
    return listo(renderer, [pm._blurMaterial, pm._equirectMaterial]).then(cede).then(function () {
      var env = pm.fromEquirectangular(tex).texture;
      pm.dispose();
      return env;
    });
  }

  /* pmremEscena(T, renderer, escena, sigma): PMREMGenerator.fromScene de siempre
     (el RoomEnvironment de las bodegones del bento) con sus shaders compilados antes:
     con un objetivo del PMREM puesto y sin tone mapping, como en _sceneToCubeUV. */
  function pmremEscena(T, renderer, escena, sigma) {
    var pm = new T.PMREMGenerator(renderer);
    pm._setSize(256);                           // lo mismo que hace fromScene
    var rt = pm._allocateTargets();
    var antes = renderer.getRenderTarget(), tm = renderer.toneMapping;
    renderer.setRenderTarget(rt); renderer.toneMapping = T.NoToneMapping;
    pm._compileMaterial(pm._blurMaterial);
    var mats = Array.from(renderer.compile(escena, new T.PerspectiveCamera(90, 1, 0.1, 100)));
    renderer.toneMapping = tm; renderer.setRenderTarget(antes);
    rt.dispose();
    return listo(renderer, [pm._blurMaterial].concat(mats)).then(cede).then(function () {
      var env = pm.fromScene(escena, sigma).texture;
      pm.dispose();
      return env;
    });
  }

  function sinEsperas(renderer) { renderer.debug.checkShaderErrors = false; return renderer; }

  /* geometria(T, receta, ops): la geometría pesada (tubos y extrusiones)
     (y las piezas de las ondas) se genera en js/geo-worker.js con el mismo Three.js y los
     mismos parámetros; aquí solo se monta el BufferGeometry con sus arrays.
     Si el worker no arranca, se genera igual en el hilo principal (mismo código). */
  var base = (document.currentScript && document.currentScript.src) || location.href;
  var worker = null, sinWorker = false, pend = {}, sig = 0;
  function obrero() {
    if (worker || sinWorker) return worker;
    try {
      worker = new Worker(new URL('geo-worker.js', base), { type: 'module' });
      worker.onmessage = function (e) { var p = pend[e.data.id]; if (!p) return; delete pend[e.data.id]; if (e.data.error) p.ko(new Error(e.data.error)); else p.ok(e.data); };
      worker.onerror = function () { sinWorker = true; worker = null; Object.keys(pend).forEach(function (k) { var p = pend[k]; delete pend[k]; p.local(); }); };
    } catch (e) { sinWorker = true; worker = null; }
    return worker;
  }
  function montarGeo(T, d) {
    var g = new T.BufferGeometry();
    Object.keys(d.attrs).forEach(function (k) { var a = d.attrs[k]; g.setAttribute(k, new T.BufferAttribute(a.array, a.itemSize, a.normalized)); });
    if (d.index) g.setIndex(new T.BufferAttribute(d.index, 1));
    (d.groups || []).forEach(function (gr) { g.addGroup(gr.start, gr.count, gr.materialIndex); });
    if (d.extra) g.userData.extra = d.extra;
    return g;
  }
  function geoLocal(T, r, ops) {
    var geo, extra = {};
    if (r.tipo === 'tube') geo = new T.TubeGeometry(new T.CatmullRomCurve3(r.pts.map(function (p) { return new T.Vector3(p[0], p[1], p[2]); }), !!r.cerrada, r.curva || 'centripetal'), r.seg, r.r, r.radial, !!r.tubeCerrado);
    else if (r.tipo === 'extrude') { var sh = [].concat(r.shapes).map(function (j) { return new T.Shape().fromJSON(j); }); geo = new T.ExtrudeGeometry(sh.length === 1 ? sh[0] : sh, r.opts); }
    (ops || []).forEach(function (op) {
      if (op[0] === 'translate') geo.translate(op[1], op[2], op[3]);
      else if (op[0] === 'scale') geo.scale(op[1], op[2], op[3]);
      else if (op[0] === 'aS') { var uv = geo.attributes.uv, a = new Float32Array(uv.count); for (var i = 0; i < uv.count; i++) a[i] = uv.getX(i); geo.setAttribute('aS', new T.BufferAttribute(a, 1)); }
      else if (op[0] === 'capUV') {
        var pos = geo.attributes.position, uv2 = geo.attributes.uv, g0 = geo.groups[0], S = op[1];
        for (var k = g0.start; k < g0.start + g0.count; k++) { var u = (pos.getX(k) + S) / (2 * S), v = (pos.getY(k) + S) / (2 * S); if (op[2] !== false && pos.getZ(k) < 0) u = 1 - u; uv2.setXY(k, u, v); }
      }
      else if (op[0] === 'ondas') {                // blade() de js/ondas.js (lo mismo que en geo-worker.js)
        geo.computeBoundingBox();
        var c = new T.Vector3(); geo.boundingBox.getCenter(c); geo.translate(-c.x, -c.y, 0); geo.computeVertexNormals();
        var p = geo.attributes.position, col = new Float32Array(p.count * 3), bb = geo.boundingBox, w = bb.max.x - bb.min.x, oc = new T.Color(op[1]), sc = new T.Color(op[3]), tmp = new T.Color();
        for (var i = 0; i < p.count; i++) {
          var uu = (p.getX(i) + c.x - bb.min.x) / w; if (!op[2]) uu = 1 - uu;
          var kk = Math.pow(Math.max(0, (uu - .35) / .65), 1.6);
          tmp.copy(oc).lerp(sc, kk); col[i * 3] = tmp.r; col[i * 3 + 1] = tmp.g; col[i * 3 + 2] = tmp.b;
        }
        geo.setAttribute('color', new T.BufferAttribute(col, 3));
        extra.c = [c.x, c.y, c.z];
      }
    });
    geo.userData.extra = extra;
    return geo;
  }
  function geometria(T, receta, ops) {
    return new Promise(function (ok, ko) {
      var local = function () { cede().then(function () { try { ok(geoLocal(T, receta, ops)); } catch (e) { ko(e); } }); };
      var w = obrero();
      if (!w) { local(); return; }
      var id = ++sig;
      pend[id] = { ok: function (d) { ok(montarGeo(T, d)); }, ko: ko, local: local };
      w.postMessage({ id: id, receta: receta, ops: ops });
    });
  }

  EV.gpu = { cede: cede, turno: turno, listo: listo, pmrem: pmrem, pmremEscena: pmremEscena, sinEsperas: sinEsperas, geometria: geometria };
})();
