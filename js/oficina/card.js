/* ==========================================================================
   oficina/card.js — la card de Disco Producción que sale del monitor.
   · Cara: shader que recorre la web real (4 capturas apiladas, config.js →
     PROJECT.strip) + brillo de cristal que se desliza con la inclinación.
   · Filo de cromo (refleja la oficina: entorno PMREM), losa navy con
     clearcoat y, detrás, una ráfaga en azul y cian con un toque del rojo de
     Disco.
   · Se inclina hacia el puntero (raycaster sobre la cara); el clic lo
     gestiona index.js (abre la web en una pestaña nueva).
   Lenguaje de las cards del bento: navy, hairline, filo de cromo.
   ========================================================================== */
import { THREE } from './scene.js';
import { PROJECT } from './config.js';

const roundedRect = (w, h, r) => { const s = new THREE.Shape(), x = -w / 2, y = -h / 2; s.moveTo(x + r, y); s.lineTo(x + w - r, y); s.quadraticCurveTo(x + w, y, x + w, y + r); s.lineTo(x + w, y + h - r);
  s.quadraticCurveTo(x + w, y + h, x + w - r, y + h); s.lineTo(x + r, y + h); s.quadraticCurveTo(x, y + h, x, y + h - r); s.lineTo(x, y + r); s.quadraticCurveTo(x, y, x + r, y); return s; };

export function crearCard(E) {
  const { scene, renderer } = E;
  const cw = PROJECT.frameAr, ch = 1, rad = .055;                       // the card is one frame of the web: 16:10
  const shape = roundedRect(cw, ch, rad);
  const faceGeo = new THREE.ShapeGeometry(shape, 24); { const uv = faceGeo.attributes.uv, pos = faceGeo.attributes.position; for (let k = 0; k < uv.count; k++) uv.setXY(k, pos.getX(k) / cw + .5, pos.getY(k) / ch + .5); }
  const edgeGeo = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(shape.getPoints(28).map(p => new THREE.Vector3(p.x, p.y, 0)), true), 360, .0075, 8, true);
  const slabGeo = new THREE.ExtrudeGeometry(roundedRect(cw, ch, rad), { depth: .02, bevelEnabled: true, bevelThickness: .008, bevelSize: .006, bevelSegments: 3, curveSegments: 20 }); slabGeo.translate(0, 0, -.03);

  // la web: 4 capturas reales apiladas (1024×640 cada una)
  let stripRes; const stripListo = new Promise(r => { stripRes = r; });
  const strip = new THREE.TextureLoader().load(PROJECT.strip, () => stripRes(), undefined, () => stripRes());
  strip.colorSpace = THREE.SRGBColorSpace; strip.anisotropy = renderer.capabilities.getMaxAnisotropy(); strip.minFilter = THREE.LinearMipmapLinearFilter;

  const U = { uStrip: { value: strip }, uFrames: { value: PROJECT.frames }, uScroll: { value: 0 }, uA: { value: 0 }, uShine: { value: .2 }, uHover: { value: 0 } };
  const face = new THREE.Mesh(faceGeo, new THREE.ShaderMaterial({ uniforms: U, transparent: true, toneMapped: false, depthWrite: false,
    vertexShader: `varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
    fragmentShader: `varying vec2 vUv;uniform sampler2D uStrip;uniform float uFrames,uScroll,uA,uShine,uHover;
      void main(){vec2 uv=vUv;
        // scroll down the page: frame f covers v in [1-(f+1)/n, 1-f/n] of the strip
        vec3 c=texture2D(uStrip,vec2(uv.x,1.-(uScroll+1.-uv.y)/uFrames)).rgb;
        // glass: a long diagonal sheen that slides with the tilt, and a cool lift at the top edge
        float d=uv.x*.82+uv.y*.57-uShine;float sh=exp(-d*d*140.)*.15+exp(-d*d*12.)*.02;
        c+=vec3(.9,.97,1.)*sh*(1.+uHover*.6)+vec3(.04,.06,.1)*smoothstep(.75,1.,uv.y);
        gl_FragColor=vec4(c,uA);
        #include <colorspace_fragment>
      }` }));
  face.position.z = .002;
  const slab = new THREE.Mesh(slabGeo, new THREE.MeshPhysicalMaterial({ color: 0x0b1226, metalness: .2, roughness: .25, clearcoat: 1, envMapIntensity: .8, transparent: true }));
  const edge = new THREE.Mesh(edgeGeo, new THREE.MeshPhysicalMaterial({ color: 0xe4e9f0, metalness: 1, roughness: .1, clearcoat: .9, envMapIntensity: 1.6, transparent: true }));

  // the burst behind: rays in blue and cyan, a few in Disco's red
  const BU = { uA: { value: 0 }, uT: { value: 0 }, uAr: { value: 1.25 } };
  const burst = new THREE.Mesh(new THREE.PlaneGeometry(cw * 2.6, cw * 2.6 / 1.25), new THREE.ShaderMaterial({ uniforms: BU, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    vertexShader: `varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
    fragmentShader: `varying vec2 vUv;uniform float uA,uT,uAr;
      float h1(float n){return fract(sin(n)*43758.5453);}
      void main(){vec2 p=(vUv-.5)*vec2(uAr,1.);float r=length(p);float a=atan(p.y,p.x);
        float x=(a/6.2831853+.5)*56.+uT*.015;float i=floor(x);
        float ray=smoothstep(mix(.08,.26,h1(i)),0.,abs(fract(x)-.5))*mix(.25,1.,h1(i*1.31));
        vec3 blue=vec3(.17,.33,1.),cyan=vec3(0.,.9,1.),red=vec3(1.,.22,.08);
        vec3 col=mix(blue,cyan,h1(i*2.7));col=mix(col,red,step(.9,h1(i*5.3)));
        float fall=exp(-r*3.2)*smoothstep(.12,.3,r);
        vec3 c=col*ray*fall*.9+mix(blue,cyan,.4)*exp(-r*r*9.)*.45;
        gl_FragColor=vec4(c*uA,1.);}` }));
  burst.position.z = -.12;

  const g = new THREE.Group(); g.add(burst, slab, face, edge); g.renderOrder = 10; g.visible = false; scene.add(g);

  // hover: el rayo del puntero contra la cara
  const ray = new THREE.Raycaster(), ptr = new THREE.Vector2(-9, -9);
  const tocada = camera => { if (!g.visible) return null; ray.setFromCamera(ptr, camera); const h = ray.intersectObject(face); return h.length ? h[0] : null; };

  return { g, face, slab, edge, burst, U, BU, cw, ch, ptr, tocada, listo: stripListo };
}
