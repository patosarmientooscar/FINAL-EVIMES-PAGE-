/* ==========================================================================
   bento/shared.js — piezas comunes de las 4 cards (copiadas tal cual del
   prototipo aprobado evimes-cards/bento.html): entorno de estudio, shader de
   fondo, puntero suavizado y su propio update(). Solo renderiza cuando está visible.
   · UN solo WebGLRenderer para todas las cards (fix TBT: antes, uno por card =
     4 contextos WebGL, 4 PMREM y cada shader compilado 4 veces). Pinta en un
     canvas fuera de pantalla con viewport/scissor del tamaño de la card y copia
     el resultado al canvas 2D de la card (drawImage): mismo píxel que antes.
   · Un solo PMREM del estudio, compartido por las escenas (las bodegones de
     bodegones.js usan el suyo, de RoomEnvironment, también compartido).
   · makeCard es asíncrona: crea la escena, espera a sus texturas, compila los
     shaders en paralelo (compileAsync) y sube las texturas, cediendo el hilo
     entre paso y paso (js/escenas.js → EV.gpu).
   Three.js 0.160.0: la MISMA URL que js/fondo/onda.js (un solo módulo).
   ========================================================================== */
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.min.js';

export { THREE };
export const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
export const NAVY = new THREE.Color(0x070a13);

// El vector real del EH: se lee de assets/logo/evimes-eh.svg (viewBox 1566x780).
export const ehPath = fetch(new URL('../../assets/logo/evimes-eh.svg', import.meta.url))
  .then(r => r.text())
  .then(txt => new DOMParser().parseFromString(txt, 'image/svg+xml').querySelector('path').getAttribute('d'));

// Arranque escalonado (js/escenas.js); respaldo si la página no lo carga.
export const G=(window.EV&&window.EV.gpu)||{cede:()=>new Promise(r=>setTimeout(r,0)),turno:fn=>Promise.resolve().then(fn),listo:()=>Promise.resolve(),pmrem:null};

// El renderer compartido (se crea con la primera card).
let R=null;
export function compartido(){
  if(R)return R;
  const canvas=document.createElement('canvas');
  const renderer=new THREE.WebGLRenderer({canvas,antialias:true,powerPreference:'high-performance'});
  renderer.debug.checkShaderErrors=false;   // producción: sin esperas síncronas en el primer uso de cada programa
  renderer.setPixelRatio(1);   // las cards ya miden en píxeles de dispositivo (pw × ph)
  renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.25;renderer.outputColorSpace=THREE.SRGBColorSpace;
  renderer.setClearColor(NAVY,1);renderer.autoClear=false;renderer.setSize(1,1,false);
  R={renderer,canvas,w:1,h:1};return R;
}
export const asegura=(pw,ph)=>{if(pw<=R.w&&ph<=R.h)return;R.w=Math.max(R.w,pw);R.h=Math.max(R.h,ph);R.renderer.setSize(R.w,R.h,false);};
// Pinta en el renderer compartido (viewport/scissor de pw × ph) y copia el resultado al canvas 2D g2.
export function pintaEn(g2,pw,ph,fn){const {renderer}=compartido();asegura(pw,ph);renderer.setViewport(0,0,pw,ph);renderer.setScissor(0,0,pw,ph);renderer.setScissorTest(true);
  fn(renderer);g2.drawImage(R.canvas,0,R.h-ph,pw,ph,0,0,pw,ph);}   // el viewport está abajo a la izquierda (GL)
// PMREM (con sus shaders compilados en paralelo, EV.gpu.pmrem) o el de siempre.
export const pmremDe=(renderer,t)=>G.pmrem?G.pmrem(THREE,renderer,t).then(e=>{t.dispose();return e;})
  :Promise.resolve().then(()=>{const pm=new THREE.PMREMGenerator(renderer);const e=pm.fromEquirectangular(t).texture;t.dispose();pm.dispose();return e;});
let estudio=null;
export function studioEnv(renderer){
  if(estudio)return estudio;
  const c=document.createElement('canvas');c.width=1024;c.height=512;const g=c.getContext('2d');
  const bg=g.createLinearGradient(0,0,0,512);bg.addColorStop(0,'#1c2748');bg.addColorStop(.5,'#0a0f1d');bg.addColorStop(1,'#04060c');g.fillStyle=bg;g.fillRect(0,0,1024,512);
  const box=(x,y,w,h,col,a)=>{const gr=g.createLinearGradient(x,y,x,y+h);gr.addColorStop(0,`rgba(${col},0)`);gr.addColorStop(.5,`rgba(${col},${a})`);gr.addColorStop(1,`rgba(${col},0)`);g.fillStyle=gr;g.fillRect(x,y,w,h)};
  g.fillStyle='rgba(235,240,248,.55)';g.fillRect(0,0,1024,150);box(90,40,600,160,'255,255,255',1);box(0,120,1024,120,'255,255,255',.5);
  box(0,195,1024,24,'255,255,255',.6);box(560,300,380,70,'235,242,255',.75);box(720,120,220,60,'230,240,255',.65);
  box(0,250,1024,40,'0,229,255',.38);box(380,330,420,30,'60,100,255',.6);box(60,380,260,24,'0,229,255',.4);box(820,60,200,40,'70,110,255',.5);
  const t=new THREE.CanvasTexture(c);t.mapping=THREE.EquirectangularReflectionMapping;t.colorSpace=THREE.SRGBColorSpace;
  return (estudio=pmremDe(renderer,t));
}
export const COMMON_GLSL=`
  float h1(float n){return fract(sin(n)*43758.5453);}
  float vn(float x){float i=floor(x),f=fract(x);f=f*f*(3.-2.*f);return mix(h1(i),h1(i+1.),f);}
  vec3 finish(vec3 col,vec2 uv,float a,float t){vec3 navy=vec3(.027,.039,.075);
    float vg=smoothstep(1.35,.2,length((uv-.5)*vec2(a,1.)));col=mix(navy*.6,col,.35+.65*vg);
    return col+(h1(dot(gl_FragCoord.xy,vec2(12.9898,78.233))+t)-.5)*.018;}`;
export const chromeMat=(o={})=>new THREE.MeshPhysicalMaterial(Object.assign({color:0xe4e9f0,metalness:1,roughness:.12,clearcoat:.9,clearcoatRoughness:.08,envMapIntensity:2.3},o));

export const cards=[];
export async function makeCard(el,setup,opts={}){
  const cv=el.querySelector('canvas');
  const {renderer}=compartido();
  const g2=cv.getContext('2d',{alpha:false});
  const scene=new THREE.Scene();scene.environment=await studioEnv(renderer);
  const camera=new THREE.PerspectiveCamera(30,1,.1,100);camera.position.set(0,0,9);
  // lado: el canvas no lleva texto encima ("Qué hacemos" de la home, js/que-hacemos.js): el objeto va centrado en él.
  // espera: promesas de la escena (texturas, entornos) que tienen que estar antes de compilar.
  const ctx={el,cv,renderer,scene,camera,W:1,H:1,pw:1,ph:1,ar:1,t:0,mx:0,my:0,tmx:0,tmy:0,hover:0,thover:0,visible:false,bg:null,espera:[],lado:!!el.closest('.qh')};
  ctx.setBg=(frag,uniforms)=>{const u=Object.assign({uT:{value:0},uA:{value:1}},uniforms);const s=new THREE.Scene();
    s.add(new THREE.Mesh(new THREE.PlaneGeometry(2,2),new THREE.ShaderMaterial({uniforms:u,depthWrite:false,depthTest:false,
      vertexShader:`varying vec2 vUv;void main(){vUv=uv;gl_Position=vec4(position.xy,0.,1.);}`,fragmentShader:`varying vec2 vUv;uniform float uT,uA;\n`+COMMON_GLSL+frag})));
    ctx.bg={scene:s,cam:new THREE.OrthographicCamera(-1,1,1,-1,0,1),u};return u;};
  const resize=()=>{const r=cv.getBoundingClientRect();ctx.W=Math.max(1,r.width);ctx.H=Math.max(1,r.height);ctx.ar=ctx.W/ctx.H;
    const d=Math.min(devicePixelRatio||1,2);ctx.pw=Math.max(1,Math.floor(ctx.W*d));ctx.ph=Math.max(1,Math.floor(ctx.H*d));
    if(cv.width!==ctx.pw||cv.height!==ctx.ph){cv.width=ctx.pw;cv.height=ctx.ph;}camera.aspect=ctx.ar;camera.updateProjectionMatrix();if(ctx.bg)ctx.bg.u.uA.value=ctx.ar;ctx.onResize&&ctx.onResize();ctx.trasResize&&ctx.trasResize();};
  el.addEventListener('pointerenter',()=>{ctx.thover=1});
  el.addEventListener('pointerleave',()=>{ctx.thover=0;ctx.tmx=ctx.tmy=0});
  el.addEventListener('pointermove',e=>{const r=el.getBoundingClientRect();ctx.tmx=(e.clientX-r.left)/r.width*2-1;ctx.tmy=-((e.clientY-r.top)/r.height*2-1);ctx.px=e.clientX;ctx.py=e.clientY;});
  ctx.update=setup(ctx)||(()=>{});
  await G.cede();
  await Promise.all(ctx.espera);
  new ResizeObserver(resize).observe(el);resize();
  asegura(ctx.pw,ctx.ph);await G.cede();   // el búfer compartido se reserva en su propia tarea
  // shaders en paralelo (KHR_parallel_shader_compile) y texturas subidas de una en una: el primer render ya no bloquea
  await renderer.compileAsync(scene,camera);if(ctx.bg)await renderer.compileAsync(ctx.bg.scene,ctx.bg.cam);
  await G.cede();
  const texs=new Set();scene.traverse(o=>{[].concat(o.material||[]).forEach(m=>['map','bumpMap','roughnessMap'].forEach(k=>m[k]&&texs.add(m[k])));});
  for(const t of texs){renderer.initTexture(t);await G.cede();}
  new IntersectionObserver(es=>{ctx.visible=es[0].isIntersecting;if(ctx.visible)el.classList.add('in');},{threshold:.08}).observe(el);
  ctx.step=(dt)=>{ctx.t+=dt;const k=1-Math.pow(.04,dt);ctx.mx+=(ctx.tmx-ctx.mx)*k;ctx.my+=(ctx.tmy-ctx.my)*k;ctx.hover+=(ctx.thover-ctx.hover)*(1-Math.pow(.02,dt));
    if(ctx.bg)ctx.bg.u.uT.value=ctx.t;ctx.update(dt);};
  ctx.render=()=>pintaEn(g2,ctx.pw,ctx.ph,r=>{r.clear();if(ctx.bg){r.render(ctx.bg.scene,ctx.bg.cam);r.clearDepth();}r.render(scene,camera);});
  cards.push(ctx);return ctx;
}
export const roundedRect=(w,h,r)=>{const s=new THREE.Shape(),x=-w/2,y=-h/2;s.moveTo(x+r,y);s.lineTo(x+w-r,y);s.quadraticCurveTo(x+w,y,x+w,y+r);s.lineTo(x+w,y+h-r);
  s.quadraticCurveTo(x+w,y+h,x+w-r,y+h);s.lineTo(x+r,y+h);s.quadraticCurveTo(x,y+h,x,y+h-r);s.lineTo(x,y+r);s.quadraticCurveTo(x,y,x+r,y);return s;};
// Geometría pesada en js/geo-worker.js (EV.gpu.geometria): mismo Three.js, mismos parámetros.
// Respaldo sin js/escenas.js: se genera aquí, igual. La card la recibe antes de compilar (ctx.espera).
export function geoDe(receta,ops=[]){
  if(G.geometria)return G.geometria(THREE,receta,ops);
  return G.cede().then(()=>{let g;
    if(receta.tipo==='tube')g=new THREE.TubeGeometry(new THREE.CatmullRomCurve3(receta.pts.map(p=>new THREE.Vector3(...p)),!!receta.cerrada,receta.curva||'centripetal'),receta.seg,receta.r,receta.radial,!!receta.tubeCerrado);
    else g=new THREE.ExtrudeGeometry(new THREE.Shape().fromJSON(receta.shapes),receta.opts);
    ops.forEach(o=>{if(o[0]==='translate')g.translate(o[1],o[2],o[3]);else if(o[0]==='capUV')planarCapUV(g,o[1],o[2]!==false);});return g;});
}
export const planarCapUV=(geo,S,mirrorBack=true)=>{const pos=geo.attributes.position,uv=geo.attributes.uv,g0=geo.groups[0];
  for(let k=g0.start;k<g0.start+g0.count;k++){let u=(pos.getX(k)+S)/(2*S);const v=(pos.getY(k)+S)/(2*S);if(mirrorBack&&pos.getZ(k)<0)u=1-u;uv.setXY(k,u,v);}uv.needsUpdate=true;};

// engraving maps from the real EH vector (bump + roughness + tint)
let ehListoRes;export const ehListo=new Promise(r=>{ehListoRes=r});
export function engraveEH(mat,size,onDone){
  const N=1024,img=new Image();
  img.onload=async()=>{
    const mk=(bg,fg,blur)=>{const c=document.createElement('canvas');c.width=c.height=N;const g=c.getContext('2d');g.fillStyle=bg;g.fillRect(0,0,N,N);
      const w=N*size,hh=w*780/1566;g.filter=`blur(${blur}px)`;const t=document.createElement('canvas');t.width=t.height=N;const tg=t.getContext('2d');
      tg.drawImage(img,(N-w)/2,(N-hh)/2,w,hh);tg.globalCompositeOperation='source-in';tg.fillStyle=fg;tg.fillRect(0,0,N,N);g.drawImage(t,0,0);return c;};
    const tex=(c,srgb)=>{const t=new THREE.CanvasTexture(c);t.anisotropy=8;if(srgb)t.colorSpace=THREE.SRGBColorSpace;return t;};
    mat.bumpMap=tex(mk('#fff','#000',2.2));mat.bumpScale=5;await G.cede();mat.roughnessMap=tex(mk('rgb(30,30,30)','rgb(120,120,120)',1.2));mat.roughness=1;await G.cede();
    mat.map=tex(mk('#fff','#b9c2cf',1),true);mat.needsUpdate=true;ehListoRes();onDone&&onDone();};
  ehPath.then(EH_D=>{img.src='data:image/svg+xml;charset=utf-8,'+encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1566 780"><path fill="#000" fill-rule="evenodd" d="${EH_D}"/></svg>`);});
}
