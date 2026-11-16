/* ==========================================================================
   oficina/scene.js — renderer, panorama, entorno, letrero, pantalla y vapor.
   · Panorama: shader equirectangular con uDim (oscurecer), uSat (saturación)
     y uSpill (la luz del monitor encendido ilumina la habitación: un cono
     suave alrededor de la pantalla que tiñe y levanta lo que alcanza).
   · Entorno PMREM sacado de la propia foto (el cromo de la card la refleja).
   · EVIMES en cian retroiluminado en la pared navy: una sola textura con las
     letras (R), el halo (G) y la sombra (B); uOn lleva el encendido con sus
     dos parpadeos (timeline.js). Lee el panorama de debajo con la MISMA
     función que la habitación: no hay costura.
   · Pantalla del monitor: encendido (una línea que se abre), ráfaga con el EH
     y túnel de luz (uTun) que acaba en blanco justo antes del flash.
   · Vapor de la taza.
   Base: el prototipo aprobado de la oficina (evimes-oficina/index.html).
   Three.js 0.160.0: la MISMA URL que js/fondo/onda.js y js/bento/.
   ========================================================================== */
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.min.js';
import { elegirPano, LOGO, SPOT } from './config.js';

export { THREE };
export const D2R = Math.PI / 180;
export const dir = (yaw, pitch, out = new THREE.Vector3()) => out.set(Math.sin(yaw * D2R) * Math.cos(pitch * D2R), Math.sin(pitch * D2R), -Math.cos(yaw * D2R) * Math.cos(pitch * D2R));

// El path real de un SVG del proyecto.
const leerPath = url => fetch(url).then(r => r.text()).then(txt => new DOMParser().parseFromString(txt, 'image/svg+xml').querySelector('path').getAttribute('d'));

/* helper: a flat quad that sits exactly on 4 points of the photo */
const D = 10;
export function quadOn(c, dist = D) { const pts = [c.tl, c.tr, c.br, c.bl].map(a => dir(a[0], a[1])); const n = new THREE.Vector3(); pts.forEach(p => n.add(p)); n.normalize();
  const P = pts.map(p => p.clone().multiplyScalar(dist / p.dot(n))); return { P, n }; }
const quadGeo = P => { const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute([...P[3].toArray(), ...P[2].toArray(), ...P[1].toArray(), ...P[0].toArray()], 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute([0, 0, 1, 0, 1, 1, 0, 1], 2)); g.setIndex([0, 1, 2, 0, 2, 3]); return g; };

function svgMask(d, vb, W, H, pad = 0) {
  return new Promise((res, rej) => { const img = new Image(); img.onload = () => { const c = document.createElement('canvas'); c.width = W; c.height = H; const g = c.getContext('2d');
    g.drawImage(img, pad, pad, W - 2 * pad, H - 2 * pad); res(c); }; img.onerror = rej;
    img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vb}"><path fill="#fff" fill-rule="evenodd" d="${d}"/></svg>`); });
}

const VERT = `varying vec2 vUv;varying vec3 vD;void main(){vUv=uv;vD=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`;
// La habitación: foto → saturación → oscurecer → luz del monitor. La usan el panorama y el letrero.
const ROOM_GLSL = `uniform sampler2D uTex;uniform float uDim,uSat,uSpill;uniform vec3 uMonDir;
  vec2 eqUV(vec3 d){d=normalize(d);return vec2(atan(d.x,-d.z)/6.2831853+.5,asin(clamp(d.y,-1.,1.))/3.14159265+.5);}
  vec3 room(vec3 d){d=normalize(d);vec3 c=texture2D(uTex,eqUV(d)).rgb;float l=dot(c,vec3(.299,.587,.114));c=mix(vec3(l),c,uSat);
    c=mix(c,vec3(.027,.039,.075),uDim);
    float an=acos(clamp(dot(d,uMonDir),-1.,1.));
    // it reaches what is in front of the screen (the desk, the keyboard) more than what is behind it
    float front=mix(.35,1.,smoothstep(.12,-.3,d.y-uMonDir.y));
    float sp=uSpill*(exp(-an*an*6.)*.8+exp(-an*an*38.)*.5)*front;
    return c+c*vec3(.3,.52,.9)*sp*1.15+vec3(.008,.02,.05)*sp;}`;

export function crearEscena(cv, opts = {}) {
  const renderer = new THREE.WebGLRenderer({ canvas: cv, antialias: true, powerPreference: 'high-performance', preserveDrawingBuffer: !!opts.captura });
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2)); renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.15;
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(56, 1, .05, 200);

  /* ---------------- the monitor (geometry first: the room needs its direction) ---------------- */
  const MON = quadOn(SPOT.monitor);
  const mon = { TL: MON.P[0], TR: MON.P[1], BR: MON.P[2], BL: MON.P[3] };
  const mR = new THREE.Vector3().subVectors(mon.TR, mon.TL); const mW = mR.length(); mR.normalize();
  const mU = new THREE.Vector3().subVectors(mon.TL, mon.BL); const mH = mU.length(); mU.normalize();
  const mN = new THREE.Vector3().crossVectors(mR, mU).normalize();          // points toward the camera
  const mC = new THREE.Vector3().add(mon.TL).add(mon.TR).add(mon.BR).add(mon.BL).multiplyScalar(.25);

  /* ---------------- panorama ---------------- */
  const PU = { uTex: { value: null }, uDim: { value: 0 }, uSat: { value: 1 }, uSpill: { value: 0 }, uMonDir: { value: mC.clone().normalize() }, uT: { value: 0 } };
  const pano = new THREE.Mesh(new THREE.SphereGeometry(60, 96, 64), new THREE.ShaderMaterial({ uniforms: PU, side: THREE.BackSide, depthWrite: false,
    vertexShader: `varying vec3 vD;void main(){vD=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
    fragmentShader: `varying vec3 vD;${ROOM_GLSL}
    void main(){gl_FragColor=vec4(room(vD),1.);
      #include <colorspace_fragment>
    }` }));
  pano.renderOrder = -10; scene.add(pano);
  const panoUrl = elegirPano(renderer.capabilities.maxTextureSize, !!opts.movil);
  let panoRes, panoRej; const panoListo = new Promise((r, j) => { panoRes = r; panoRej = j; });
  const panoTex = new THREE.TextureLoader().load(panoUrl, t => { t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = renderer.capabilities.getMaxAnisotropy(); t.minFilter = THREE.LinearMipmapLinearFilter; t.generateMipmaps = true; t.needsUpdate = true;
    // the office itself becomes the reflection for the chrome edge
    const eq = t.clone(); eq.mapping = THREE.EquirectangularReflectionMapping; const pm = new THREE.PMREMGenerator(renderer); scene.environment = pm.fromEquirectangular(eq).texture; pm.dispose();
    panoRes(); }, undefined, e => panoRej(e));
  panoTex.colorSpace = THREE.SRGBColorSpace; PU.uTex.value = panoTex;

  /* ---------------- EVIMES: backlit cyan letters on the navy wall ---------------- */
  const signU = { uOn: { value: 0 }, uM: { value: null } };
  const pared = (async () => {
    const WM_D = await leerPath(LOGO.wordmark);
    const W = 2048, lw = Math.round(W * .72), lh = Math.round(lw * 261 / 1442), H = Math.round(lh * 3.2);
    const letras = await svgMask(WM_D, '0 0 1442 261', lw, lh, 0);
    const capa = (pasadas, dy = 0) => { const c = document.createElement('canvas'); c.width = W; c.height = H; const g = c.getContext('2d');
      pasadas.forEach(([blur, alpha]) => { g.filter = blur ? `blur(${blur}px)` : 'none'; g.globalAlpha = alpha; g.globalCompositeOperation = 'lighter'; g.drawImage(letras, (W - lw) / 2, (H - lh) / 2 + dy); });
      return g.getImageData(0, 0, W, H).data; };
    const R = capa([[0, 1]]), G = capa([[70, 1], [26, .85], [9, .6]]), B = capa([[7, .9]], lh * .07);
    const out = new ImageData(W, H); for (let i = 0; i < out.data.length; i += 4) { out.data[i] = R[i + 3]; out.data[i + 1] = G[i + 3]; out.data[i + 2] = B[i + 3]; out.data[i + 3] = 255; }
    const c = document.createElement('canvas'); c.width = W; c.height = H; c.getContext('2d').putImageData(out, 0, 0);
    const tex = new THREE.CanvasTexture(c); tex.anisotropy = 8; signU.uM.value = tex;
    const wDeg = 21 / .72, s = SPOT.wall, hDeg = wDeg * H / W;          // letters stay 21° wide; the rest is room for the halo
    const q = quadOn({ tl: [s[0] - wDeg / 2, s[1] + hDeg / 2], tr: [s[0] + wDeg / 2, s[1] + hDeg / 2], br: [s[0] + wDeg / 2, s[1] - hDeg / 2], bl: [s[0] - wDeg / 2, s[1] - hDeg / 2] }, 20);
    const mesh = new THREE.Mesh(quadGeo(q.P), new THREE.ShaderMaterial({ uniforms: Object.assign({}, PU, signU), transparent: true, depthWrite: false,
      vertexShader: VERT,
      fragmentShader: `varying vec2 vUv;varying vec3 vD;uniform sampler2D uM;uniform float uOn;${ROOM_GLSL}
      void main(){vec3 c=room(vD);vec3 m=texture2D(uM,vUv).rgb;float L=m.r,halo=m.g,sh=m.b;
        vec3 cyan=vec3(0.,.9,1.);
        // letters stand off the wall: a soft shadow below them, washed out when the light behind comes on
        vec3 o=c*(1.-sh*.5*(1.-uOn*.75));
        // the light behind the letters spills onto the wall around them
        o+=cyan*(halo*.55+halo*halo*.7)*uOn;
        // faces: dark acrylic when off, lit cyan (white-hot core) when on
        vec3 face=mix(c*.5,mix(cyan,vec3(.82,1.,1.),.5)*1.3,uOn);
        o=mix(o,face,L);
        gl_FragColor=vec4(o,clamp(max(L,max(halo*uOn*1.4,sh*.7)),0.,1.));
        #include <colorspace_fragment>
      }` }));
    mesh.renderOrder = -5; scene.add(mesh);
  })();

  /* ---------------- the monitor screen: power-on, burst with the EH, light tunnel ---------------- */
  const SU = { uBoot: { value: 0 }, uT: { value: 0 }, uLogo: { value: null }, uAr: { value: mW / mH }, uTun: { value: 0 }, uAfter: { value: 0 }, uLogoA: { value: 1 } };
  let logo;
  {
    const inset = .035, P = [mon.BL, mon.BR, mon.TR, mon.TL].map(p => p.clone().lerp(mC, inset));
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(P.flatMap(p => p.toArray()), 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute([0, 0, 1, 0, 1, 1, 0, 1], 2)); g.setIndex([0, 1, 2, 0, 2, 3]);
    const screen = new THREE.Mesh(g, new THREE.ShaderMaterial({ uniforms: SU, transparent: true, depthWrite: false, toneMapped: false,
      vertexShader: `varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
      fragmentShader: `varying vec2 vUv;uniform float uBoot,uT,uAr,uTun,uAfter,uLogoA;uniform sampler2D uLogo;
      float h1(float n){return fract(sin(n)*43758.5453);}
      void main(){vec2 p=(vUv-.5)*vec2(uAr,1.);float r=length(p);float a=atan(p.y,p.x);
        vec3 navy=vec3(.027,.039,.075),blue=vec3(.17,.33,1.),cyan=vec3(0.,.9,1.);
        // burst: rays from the centre, a soft core and the EH
        float x=(a/6.2831853+.5)*40.+uT*.02;float i=floor(x);float ray=smoothstep(mix(.05,.2,h1(i)),0.,abs(fract(x)-.5))*mix(.3,1.,h1(i*1.3));
        vec3 c=navy+blue*ray*.55/(1.+r*r*8.)+mix(blue,cyan,.5)*exp(-r*r*10.)*.5;
        float lg=texture2D(uLogo,vUv).r;c=mix(c,vec3(.93,.95,1.),lg*.95*uLogoA*(1.-smoothstep(0.,.35,uTun)));
        // light tunnel: streaks rushing past us, faster and brighter as we fall in, ending in white
        if(uTun>0.){
          float z=.32/(r+.015)+uT*.8+uTun*uTun*22.;
          float an=(a/6.2831853+.5)*72.;float ai=floor(an);
          float lane=smoothstep(.5,0.,abs(fract(an)-.5))*mix(.4,1.,h1(ai*3.7));
          float dash=smoothstep(.35,.0,abs(fract(z*.6+h1(ai)*9.)-.5)-.12);
          float st=lane*dash*smoothstep(.02,.45,r);
          vec3 tc=mix(blue,cyan,h1(ai*1.9))*st*(.8+uTun*2.2)+mix(blue,cyan,.65)*exp(-r*r*(9.-uTun*7.))*(.35+uTun*1.4);
          c=mix(c,c*.35+tc,smoothstep(0.,.25,uTun));
          c=mix(c,vec3(.92,.99,1.),smoothstep(.72,1.,uTun)*(.35+.65*exp(-r*r*1.5)));
        }
        float scan=.96+.04*sin(vUv.y*700.);c*=mix(scan,1.,smoothstep(0.,.3,uTun));   // the scanlines would turn into stripes as we zoom in
        // power-on: a thin line opens into the full screen
        float open=smoothstep(0.,.35,uBoot);float band=smoothstep(open*.5+.002,open*.5-.002,abs(vUv.y-.5));
        float wipe=smoothstep(0.,.08,uBoot);c*=band*wipe;
        c*=1.-uAfter*.45;                               // once the web is out, the screen settles back
        gl_FragColor=vec4(c,band*wipe);}` }));
    screen.renderOrder = -4; scene.add(screen);
    logo = leerPath(LOGO.eh).then(EH_D => svgMask(EH_D, '0 0 1566 780', 1024, Math.round(1024 / (mW / mH)), 0)).then(c => {
      // centre a small EH in the middle of the screen
      const o = document.createElement('canvas'); o.width = c.width; o.height = c.height; const g = o.getContext('2d'); const w = o.width * .22, h = w * 780 / 1566;
      g.drawImage(c, 0, 0, c.width, c.height, (o.width - w) / 2, (o.height - h) / 2, w, h); SU.uLogo.value = new THREE.CanvasTexture(o); });
  }
  SU.uLogo.value = new THREE.DataTexture(new Uint8Array([0, 0, 0, 255]), 1, 1); SU.uLogo.value.needsUpdate = true;

  /* ---------------- steam over the mug ---------------- */
  const steamU = { uT: { value: 0 }, uA: { value: 0 } };
  { const c = SPOT.mug; const q = quadOn({ tl: [c[0] - 1.7, c[1] + 9], tr: [c[0] + 1.7, c[1] + 9], br: [c[0] + 1.7, c[1]], bl: [c[0] - 1.7, c[1]] });
   scene.add(new THREE.Mesh(quadGeo(q.P), new THREE.ShaderMaterial({ uniforms: steamU, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
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

  return { renderer, scene, camera, PU, SU, signU, steamU, mon: { mR, mU, mN, mC, mW, mH }, panoListo, listo: Promise.all([panoListo, pared, logo]) };
}
