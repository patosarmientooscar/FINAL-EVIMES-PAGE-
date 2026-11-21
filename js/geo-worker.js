/* ==========================================================================
   geo-worker.js — genera geometrías pesadas fuera del hilo principal (fix TBT).
   El MISMO Three.js 0.160.0 y los MISMOS parámetros que antes en el hilo
   principal: la malla sale idéntica. Devuelve los atributos como arrays
   transferibles (sin copia). Lo usa js/escenas.js → EV.gpu.geometria().
   Recetas:
     tube    { pts:[[x,y,z]…], curva:'centripetal', cerrada, seg, r, radial, tubeCerrado }
     extrude { shapes: shape.toJSON(), opts }
   Operaciones después (en orden): ['translate',x,y,z] · ['scale',x,y,z] ·
     ['aS'] (atributo aS = uv.x, la de los tubos de la onda) ·
     ['capUV', S, espejoAtras] (planarCapUV de js/bento/shared.js, igual) ·
     ['ondas', colorExterior, interiorEnMasX, colorUnion] (las piezas de js/ondas.js:
       centra en x/y por su caja, normales y el degradado de color de vértices
       hacia la unión; devuelve el centro original en extra.c).
   ========================================================================== */
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.min.js';

function crear(r) {
  if (r.tipo === 'tube') {
    const curva = new THREE.CatmullRomCurve3(r.pts.map(p => new THREE.Vector3(p[0], p[1], p[2])), !!r.cerrada, r.curva || 'centripetal');
    return new THREE.TubeGeometry(curva, r.seg, r.r, r.radial, !!r.tubeCerrado);
  }
  if (r.tipo === 'extrude') {
    const shapes = [].concat(r.shapes).map(j => new THREE.Shape().fromJSON(j));
    return new THREE.ExtrudeGeometry(shapes.length === 1 ? shapes[0] : shapes, r.opts);
  }
  throw new Error('receta desconocida: ' + r.tipo);
}

// blade() de js/ondas.js (misma cuenta, mismo Three.js): centrado, normales y colores de vértice.
function ondas(geo, outer, innerAtPlusX, seam, extra) {
  geo.computeBoundingBox();
  const c = new THREE.Vector3(); geo.boundingBox.getCenter(c); geo.translate(-c.x, -c.y, 0); geo.computeVertexNormals();
  const pos = geo.attributes.position, col = new Float32Array(pos.count * 3), bb = geo.boundingBox, w = bb.max.x - bb.min.x, oc = new THREE.Color(outer), sc = new THREE.Color(seam), tmp = new THREE.Color();
  for (let i = 0; i < pos.count; i++) {
    let u = (pos.getX(i) + c.x - bb.min.x) / w; if (!innerAtPlusX) u = 1 - u;
    const k = Math.pow(Math.max(0, (u - .35) / .65), 1.6);
    tmp.copy(oc).lerp(sc, k); col[i * 3] = tmp.r; col[i * 3 + 1] = tmp.g; col[i * 3 + 2] = tmp.b;
  }
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  extra.c = [c.x, c.y, c.z];
}

// planarCapUV de js/bento/shared.js (misma cuenta).
function capUV(geo, S, mirrorBack) {
  const pos = geo.attributes.position, uv = geo.attributes.uv, g0 = geo.groups[0];
  for (let k = g0.start; k < g0.start + g0.count; k++) {
    let u = (pos.getX(k) + S) / (2 * S); const v = (pos.getY(k) + S) / (2 * S);
    if (mirrorBack && pos.getZ(k) < 0) u = 1 - u;
    uv.setXY(k, u, v);
  }
}

self.onmessage = e => {
  const { id, receta, ops } = e.data;
  try {
    const geo = crear(receta), extra = {};
    for (const op of ops || []) {
      if (op[0] === 'translate') geo.translate(op[1], op[2], op[3]);
      else if (op[0] === 'scale') geo.scale(op[1], op[2], op[3]);
      else if (op[0] === 'aS') { const uv = geo.attributes.uv, a = new Float32Array(uv.count); for (let i = 0; i < uv.count; i++) a[i] = uv.getX(i); geo.setAttribute('aS', new THREE.BufferAttribute(a, 1)); }
      else if (op[0] === 'capUV') capUV(geo, op[1], op[2] !== false);
      else if (op[0] === 'ondas') ondas(geo, op[1], op[2], op[3], extra);
    }
    const attrs = {}, trans = [];
    for (const k in geo.attributes) { const a = geo.attributes[k]; attrs[k] = { array: a.array, itemSize: a.itemSize, normalized: a.normalized }; trans.push(a.array.buffer); }
    const index = geo.index ? geo.index.array : null; if (index) trans.push(index.buffer);
    self.postMessage({ id, attrs, index, groups: geo.groups, extra }, trans);
  } catch (err) { self.postMessage({ id, error: String(err && err.message || err) }); }
};
