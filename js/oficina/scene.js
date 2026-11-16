/* ==========================================================================
   oficina/scene.js — renderer, panorama (shader con uDim y uSat), entorno
   PMREM desde la propia foto, EVIMES grabado en la pared, la pantalla del
   monitor y el vapor de la taza. Copiado tal cual del prototipo aprobado
   (evimes-oficina/index.html); solo cambia de dónde salen los vectores (los
   SVG reales de assets/logo/) y la ruta del panorama (config.js).
   Three.js 0.160.0: la MISMA URL que js/fondo/onda.js y js/bento/.
   ========================================================================== */
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.min.js';
import { PANO, LOGO, SPOT } from './config.js';

export { THREE };
export const D2R = Math.PI / 180;
export const dir = (yaw, pitch, out = new THREE.Vector3()) => out.set(Math.sin(yaw * D2R) * Math.cos(pitch * D2R), Math.sin(pitch * D2R), -Math.cos(yaw * D2R) * Math.cos(pitch * D2R));

// El path real de un SVG del proyecto.
const leerPath = url => fetch(url).then(r => r.text()).then(txt => new DOMParser().parseFromString(txt, 'image/svg+xml').querySelector('path').getAttribute('d'));

/* helper: a flat quad that sits exactly on 4 points of the photo */
const D = 10;
function quadOn(c, dist = D) { const pts = [c.tl, c.tr, c.br, c.bl].map(a => dir(a[0], a[1])); const n = new THREE.Vector3(); pts.forEach(p => n.add(p)); n.normalize();
  const P = pts.map(p => p.clone().multiplyScalar(dist / p.dot(n))); return { P, n }; }

function svgMask(d, vb, W, H, pad = 0) { if (d.length < 20) return Promise.resolve((() => { const c = document.createElement('canvas'); c.width = W; c.height = H; const g = c.getContext('2d'); g.fillStyle = '#fff'; g.font = `700 ${H * .62}px Georgia`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(vb.startsWith('0 0 1442') ? 'EVIMES' : 'EH', W / 2, H / 2); return c; })());
  return new Promise(res => { const img = new Image(); img.onload = () => { const c = document.createElement('canvas'); c.width = W; c.height = H; const g = c.getContext('2d');
  g.drawImage(img, pad, pad, W - 2 * pad, H - 2 * pad); res(c); }; img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vb}"><path fill="#fff" fill-rule="evenodd" d="${d}"/></svg>`); }); }

export function crearEscena(cv, opts = {}) {
  const renderer = new THREE.WebGLRenderer({ canvas: cv, antialias: true, powerPreference: 'high-performance', preserveDrawingBuffer: !!opts.captura });
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2)); renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.15;
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(56, 1, .05, 200);

  /* ---------------- panorama ---------------- */
  const PU = { uTex: { value: null }, uDim: { value: 0 }, uSat: { value: 1 }, uT: { value: 0 } };
  const PANO_GLSL = `uniform sampler2D uTex;
  vec2 eqUV(vec3 d){d=normalize(d);return vec2(atan(d.x,-d.z)/6.2831853+.5,asin(clamp(d.y,-1.,1.))/3.14159265+.5);}`;
  const pano = new THREE.Mesh(new THREE.SphereGeometry(60, 96, 64), new THREE.ShaderMaterial({ uniforms: PU, side: THREE.BackSide, depthWrite: false,
    vertexShader: `varying vec3 vD;void main(){vD=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
    fragmentShader: `varying vec3 vD;uniform float uDim,uSat;${PANO_GLSL}
    void main(){vec3 c=texture2D(uTex,eqUV(vD)).rgb;float l=dot(c,vec3(.299,.587,.114));c=mix(vec3(l),c,uSat);
      c=mix(c,vec3(.027,.039,.075),uDim);gl_FragColor=vec4(c,1.);
      #include <colorspace_fragment>
    }` }));
  pano.renderOrder = -10; scene.add(pano);
  let panoRes; const panoListo = new Promise(r => { panoRes = r; });
  const panoTex = new THREE.TextureLoader().load(PANO, t => { t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = renderer.capabilities.getMaxAnisotropy(); t.minFilter = THREE.LinearMipmapLinearFilter; t.generateMipmaps = true; t.needsUpdate = true;
    // the office itself becomes the reflection for every chrome edge
    const eq = t.clone(); eq.mapping = THREE.EquirectangularReflectionMapping; const pm = new THREE.PMREMGenerator(renderer); scene.environment = pm.fromEquirectangular(eq).texture; pm.dispose();
    panoRes(); }, undefined, e => panoRes(Promise.reject(e)));
  panoTex.colorSpace = THREE.SRGBColorSpace; PU.uTex.value = panoTex;

  /* ---------------- EVIMES engraved in the navy wall ---------------- */
  const pared = (async () => {
    const WM_D = await leerPath(LOGO.wordmark);
    const W = 2048, H = Math.round(W * 261 / 1442) + 64; const m = await svgMask(WM_D, '0 0 1442 261', W, H, 32);
    const tex = new THREE.CanvasTexture(m); tex.anisotropy = 8;
    const wDeg = 21, c = SPOT.wall, hDeg = wDeg * H / W;
    const q = quadOn({ tl: [c[0] - wDeg / 2, c[1] + hDeg / 2], tr: [c[0] + wDeg / 2, c[1] + hDeg / 2], br: [c[0] + wDeg / 2, c[1] - hDeg / 2], bl: [c[0] - wDeg / 2, c[1] - hDeg / 2] }, 20);
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute([...q.P[3].toArray(), ...q.P[2].toArray(), ...q.P[1].toArray(), ...q.P[0].toArray()], 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute([0, 0, 1, 0, 1, 1, 0, 1], 2)); g.setIndex([0, 1, 2, 0, 2, 3]);
    // samples the photo underneath, so the letters look carved into that exact wall
    const mesh = new THREE.Mesh(g, new THREE.ShaderMaterial({ uniforms: { uTex: PU.uTex, uM: { value: tex }, uPx: { value: new THREE.Vector2(1 / W, 1 / H) } }, transparent: true, depthWrite: false,
      vertexShader: `varying vec2 vUv;varying vec3 vD;void main(){vUv=uv;vD=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
      fragmentShader: `varying vec2 vUv;varying vec3 vD;uniform sampler2D uM;uniform vec2 uPx;${PANO_GLSL}
      void main(){vec3 c=texture2D(uTex,eqUV(vD)).rgb;float m=texture2D(uM,vUv).r;
        float up=texture2D(uM,vUv+vec2(0.,uPx.y*5.)).r,dn=texture2D(uM,vUv-vec2(0.,uPx.y*5.)).r;
        float inner=m*.42;float lip=clamp(dn-m,0.,1.)*.55;float shade=clamp(up-m,0.,1.)*.5;   // light from above: top lip shadowed, bottom lip lit
        vec3 o=c*(1.-inner-shade)+vec3(.55,.62,.75)*lip*.35;float a=max(max(m,lip),shade);
        gl_FragColor=vec4(o,a);
        #include <colorspace_fragment>
      }` }));
    mesh.renderOrder = -5; scene.add(mesh);
  })();

  /* ---------------- the monitor screen ---------------- */
  const MON = quadOn(SPOT.monitor);
  const mon = { TL: MON.P[0], TR: MON.P[1], BR: MON.P[2], BL: MON.P[3] };
  const mR = new THREE.Vector3().subVectors(mon.TR, mon.TL); const mW = mR.length(); mR.normalize();
  const mU = new THREE.Vector3().subVectors(mon.TL, mon.BL); const mH = mU.length(); mU.normalize();
  const mN = new THREE.Vector3().crossVectors(mR, mU).normalize();          // points toward the camera
  const mC = new THREE.Vector3().add(mon.TL).add(mon.TR).add(mon.BR).add(mon.BL).multiplyScalar(.25);
  const SU = { uBoot: { value: 0 }, uT: { value: 0 }, uLogo: { value: null }, uAr: { value: mW / mH } };
  let logo;
  {
    const inset = .035; const lerp2 = (a, b, t) => a.clone().lerp(b, t);
    const tl = lerp2(lerp2(mon.TL, mon.BR, inset), mon.TL, 0), P = [mon.BL, mon.BR, mon.TR, mon.TL].map(p => p.clone().lerp(mC, inset));
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(P.flatMap(p => p.toArray()), 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute([0, 0, 1, 0, 1, 1, 0, 1], 2)); g.setIndex([0, 1, 2, 0, 2, 3]);
    const screen = new THREE.Mesh(g, new THREE.ShaderMaterial({ uniforms: SU, transparent: true, depthWrite: false, toneMapped: false,
      vertexShader: `varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
      fragmentShader: `varying vec2 vUv;uniform float uBoot,uT,uAr;uniform sampler2D uLogo;
      float h1(float n){return fract(sin(n)*43758.5453);}
      void main(){vec2 p=(vUv-.5)*vec2(uAr,1.);float r=length(p);float a=atan(p.y,p.x);
        vec3 navy=vec3(.027,.039,.075),blue=vec3(.17,.33,1.),cyan=vec3(0.,.9,1.);
        float x=(a/6.2831853+.5)*40.+uT*.02;float i=floor(x);float ray=smoothstep(mix(.05,.2,h1(i)),0.,abs(fract(x)-.5))*mix(.3,1.,h1(i*1.3));
        vec3 c=navy+blue*ray*.55/(1.+r*r*8.)+mix(blue,cyan,.5)*exp(-r*r*10.)*.5;
        float lg=texture2D(uLogo,vUv).r;c=mix(c,vec3(.93,.95,1.),lg*.95);
        float scan=.96+.04*sin(vUv.y*700.);c*=scan;
        // power-on: a thin line opens into the full screen
        float open=smoothstep(0.,.35,uBoot);float band=smoothstep(open*.5+.002,open*.5-.002,abs(vUv.y-.5));
        float wipe=smoothstep(0.,.08,uBoot);c*=band*wipe;
        float fade=1.-smoothstep(.75,1.,uBoot)*.55;     // dims a little when the cards leave
        gl_FragColor=vec4(c*fade,band*wipe);}` }));
    screen.renderOrder = -4; scene.add(screen);
    logo = leerPath(LOGO.eh).then(EH_D => svgMask(EH_D, '0 0 1566 780', 1024, Math.round(1024 / (mW / mH)), 0)).then(c => {
      // centre a small EH in the middle of the screen
      const o = document.createElement('canvas'); o.width = c.width; o.height = c.height; const g = o.getContext('2d'); const w = o.width * .22, h = w * 780 / 1566;
      g.drawImage(c, 0, 0, c.width, c.height, (o.width - w) / 2, (o.height - h) / 2, w, h); SU.uLogo.value = new THREE.CanvasTexture(o); });
  }
  SU.uLogo.value = new THREE.DataTexture(new Uint8Array([0, 0, 0, 255]), 1, 1); SU.uLogo.value.needsUpdate = true;

  /* ---------------- steam over the mug ---------------- */
  const steamU = { uT: { value: 0 }, uA: { value: 0 } };
  { const c = SPOT.mug; const q = quadOn({ tl: [c[0] - 1.7, c[1] + 8], tr: [c[0] + 1.7, c[1] + 8], br: [c[0] + 1.7, c[1] - 1], bl: [c[0] - 1.7, c[1] - 1] });
   const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute([...q.P[3].toArray(), ...q.P[2].toArray(), ...q.P[1].toArray(), ...q.P[0].toArray()], 3));
   g.setAttribute('uv', new THREE.Float32BufferAttribute([0, 0, 1, 0, 1, 1, 0, 1], 2)); g.setIndex([0, 1, 2, 0, 2, 3]);
   scene.add(new THREE.Mesh(g, new THREE.ShaderMaterial({ uniforms: steamU, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    vertexShader: `varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
    fragmentShader: `varying vec2 vUv;uniform float uT,uA;
     float h(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
     float n(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(h(i),h(i+vec2(1,0)),f.x),mix(h(i+vec2(0,1)),h(i+vec2(1,1)),f.x),f.y);}
     void main(){vec2 p=vUv;float y=p.y;float t=uT*.35;
       float x=p.x-.5+ (n(vec2(y*2.5-t,1.))-.5)*.5*y + sin(y*7.-uT*1.3)*.05*y;
       float w=.035+y*.12;float core=exp(-x*x/(w*w));
       float wisp=n(vec2(x*6.,y*5.-t*2.))*n(vec2(x*3.+4.,y*3.-t*1.4));
       float a=core*wisp*smoothstep(0.,.12,y)*smoothstep(1.,.45,y)*.55*uA;
       gl_FragColor=vec4(vec3(1.)*a,a);}` }))); }

  return { renderer, scene, camera, PU, SU, steamU, mon: { mR, mU, mN, mC, mW, mH }, panoListo, listo: Promise.all([panoListo, pared, logo]) };
}
