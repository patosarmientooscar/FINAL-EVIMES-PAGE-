/* ==========================================================================
   bento/bodegones.js — Posicionamiento y Software con IA: dos bodegones
   quietos sobre hormigón oscuro (réplica del prototipo aprobado
   Downloads/evimes-cards/bodegones.html: geometrías, materiales, luces,
   cámara, setViewOffset y texturas pintadas en canvas).
   · Posicionamiento: el móvil negro con la búsqueda "barbería cerca de mí"
     y "Tu negocio" el primero, sobre el bloque de hormigón.
   · Software con IA: pantalla de cristal ahumado con marco y pie de aluminio
     negro, el editor "reservas.js" y un teclado bajo negro (InstancedMesh).
   · Sin movimiento: cada escena se pinta UNA vez al entrar en pantalla
     (IntersectionObserver) y otra solo si cambia el tamaño. Sin bucle, sin
     parallax, sin hover 3D (el hover de la card es CSS: sube 2 px).
   · Ligero: pintan con el renderer compartido del bento (shared.js, el que
     ya existe para el destello): ningún contexto WebGL más. El resultado se
     copia al canvas 2D de la card y después se liberan de la GPU las texturas
     y los mapas de sombra (se vuelven a subir solo si hay que repintar).
     Shaders compilados en paralelo antes del primer render; el PMREM del
     RoomEnvironment y el hormigón se generan una vez y se comparten.
   · Cian solo en el punto del pin y en el cursor del editor.
   ========================================================================== */
import { THREE, G, compartido, pintaEn } from './shared.js';
import { RoundedBoxGeometry } from 'https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/geometries/RoundedBoxGeometry.js';
import { RoomEnvironment } from 'https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/environments/RoomEnvironment.js';

// La tipografía de la web y la mono del sistema (no hay mono auto-alojada).
const SANS = '"Schibsted Grotesk", "Helvetica Neue", Arial, sans-serif';
const MONO = 'ui-monospace, "SF Mono", Menlo, Consolas, "Liberation Mono", "Courier New", monospace';

/* ---------- texturas (una vez) ---------- */
function rng(seed){return()=>((seed=Math.imul(seed^seed>>>15,seed|1)^(seed+Math.imul(seed^seed>>>7,seed|61)))>>>0)/4294967296;}
function concreteTex(base){
  const N=512,c=document.createElement('canvas');c.width=c.height=N;const g=c.getContext('2d'),r=rng(7);
  const s=document.createElement('canvas');s.width=s.height=48;const sg=s.getContext('2d');
  for(let y=0;y<48;y++)for(let x=0;x<48;x++){const v=base+(r()-.5)*12;sg.fillStyle=`rgb(${v},${v},${v+1})`;sg.fillRect(x,y,1,1);}
  g.imageSmoothingEnabled=true;g.drawImage(s,0,0,N,N);
  const id=g.getImageData(0,0,N,N),d=id.data;
  for(let i=0;i<d.length;i+=4){const n=(r()-.5)*14;d[i]+=n;d[i+1]+=n;d[i+2]+=n;}
  g.putImageData(id,0,0);
  for(let i=0;i<900;i++){const x=r()*N,y=r()*N,rad=r()*1.8+.4;g.fillStyle=`rgba(0,0,0,${.25+r()*.4})`;g.beginPath();g.arc(x,y,rad,0,7);g.fill();}
  const t=new THREE.CanvasTexture(c);t.wrapS=t.wrapT=THREE.RepeatWrapping;t.repeat.set(1.6,1.6);t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=8;return t;
}
function rr(g,x,y,w,h,r){g.beginPath();g.roundRect(x,y,w,h,r);}

/* pantalla del móvil: una búsqueda genérica, "Tu negocio" el primero */
function phoneScreen(){
  const W=600,H=1240,c=document.createElement('canvas');c.width=W;c.height=H;const g=c.getContext('2d');
  g.fillStyle='#f3f3f1';g.fillRect(0,0,W,H);
  g.fillStyle='#1a1b1e';g.font=`600 26px ${SANS}`;g.fillText('9:41',44,62);
  rr(g,W-104,44,46,22,6);g.strokeStyle='#1a1b1e';g.lineWidth=2.5;g.stroke();g.fillRect(W-100,48,30,14);
  // buscador
  rr(g,32,112,W-64,78,39);g.fillStyle='#fff';g.fill();g.strokeStyle='#dcdcd8';g.lineWidth=2;g.stroke();
  g.strokeStyle='#8a8b90';g.lineWidth=3.5;g.beginPath();g.arc(84,151,13,0,7);g.stroke();g.beginPath();g.moveTo(94,161);g.lineTo(104,171);g.stroke();
  g.fillStyle='#1a1b1e';g.font=`500 28px ${SANS}`;g.fillText('barbería cerca de mí',126,161);
  // pestañas
  g.font=`500 22px ${SANS}`;[['Todo',44],['Mapa',138],['Imágenes',236],['Noticias',376]].forEach(([t,x],i)=>{g.fillStyle=i?'#8a8b90':'#1a1b1e';g.fillText(t,x,244);});
  g.fillStyle='#1a1b1e';g.fillRect(40,258,62,4);g.fillStyle='#e2e2de';g.fillRect(0,262,W,2);
  // primer resultado
  const y0=292;rr(g,24,y0,W-48,560,26);g.fillStyle='#fff';g.fill();g.strokeStyle='#e4e4e0';g.lineWidth=2;g.stroke();
  // mapa
  g.save();rr(g,24,y0,W-48,230,26);g.clip();g.fillStyle='#e9e8e3';g.fillRect(24,y0,W-48,230);
  g.strokeStyle='#ffffff';g.lineWidth=14;[[0,90,600,40],[0,190,600,230],[150,0,120,260],[380,0,470,260]].forEach(([a,b,c2,d])=>{g.beginPath();g.moveTo(24+a,y0+b);g.lineTo(24+c2,y0+d);g.stroke();});
  g.strokeStyle='#f6f5f1';g.lineWidth=6;[[0,140,600,120],[260,0,300,260]].forEach(([a,b,c2,d])=>{g.beginPath();g.moveTo(24+a,y0+b);g.lineTo(24+c2,y0+d);g.stroke();});
  g.fillStyle='#d9dfd3';rr(g,430,y0+20,110,60,10);g.fill();
  g.restore();
  // pin (oscuro, con el punto cian)
  const px=300,py=y0+118;g.fillStyle='#1a1b1e';g.beginPath();g.arc(px,py-22,20,Math.PI,0);g.lineTo(px,py+8);g.closePath();g.fill();
  g.fillStyle='#00b8d4';g.beginPath();g.arc(px,py-22,7,0,7);g.fill();
  // textos
  g.fillStyle='#1a1b1e';g.font=`600 34px ${SANS}`;g.fillText('Tu negocio',52,y0+284);
  g.fillStyle='#8a8b90';g.font=`400 22px ${SANS}`;g.fillText('Barbería · a 300 m',52,y0+322);
  g.fillStyle='#4a4b50';g.fillText('Abierto · Cierra a las 21:00',52,y0+358);
  // botones
  [['Cómo llegar',52,190],['Llamar',256,120],['Reservar',390,140]].forEach(([t,x,w],i)=>{
    rr(g,x,y0+392,w,58,29);if(i===0){g.fillStyle='#1a1b1e';g.fill();g.fillStyle='#fff';}else{g.strokeStyle='#d6d6d2';g.lineWidth=2;g.stroke();g.fillStyle='#1a1b1e';}
    g.font=`500 21px ${SANS}`;const tw=g.measureText(t).width;g.fillText(t,x+(w-tw)/2,y0+428);});
  g.fillStyle='#8a8b90';g.font=`400 20px ${SANS}`;g.fillText('tunegocio.es',52,y0+500);
  g.fillStyle='#c8c8c4';g.fillRect(52,y0+520,180,4);
  // los siguientes resultados, apagados
  for(let k=0;k<3;k++){const y=y0+600+k*150;g.fillStyle='#d4d4d0';rr(g,40,y,300,22,6);g.fill();
    g.fillStyle='#e2e2de';rr(g,40,y+40,W-120,16,5);g.fill();rr(g,40,y+68,W-200,16,5);g.fill();g.fillStyle='#ececea';g.fillRect(40,y+118,W-80,2);}
  const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=8;return t;
}

/* el editor oscuro "reservas.js": grises con resaltado discreto; el cursor, el único cian */
function codeTex(){
  const W=1500,H=940,c=document.createElement('canvas');c.width=W;c.height=H;const g=c.getContext('2d');
  const bg=g.createLinearGradient(0,0,0,H);bg.addColorStop(0,'#101114');bg.addColorStop(1,'#0b0c0e');g.fillStyle=bg;g.fillRect(0,0,W,H);
  // barra de la ventana
  g.fillStyle='#16171a';g.fillRect(0,0,W,70);g.fillStyle='#2a2b30';[0,1,2].forEach(i=>{g.beginPath();g.arc(44+i*34,35,9,0,7);g.fill();});
  g.font=`500 24px ${MONO}`;g.fillStyle='#6b6d75';g.fillText('reservas.js',W/2-70,44);
  const C={k:'#8f93a0',f:'#e6e7eb',s:'#b9bcc4',c:'#55575f',p:'#6b6d75',a:'#00b8d4'};
  const L=[
    [['c','// Cuando llega un mensaje, reserva sola']],
    [],
    [['k','on'],['p','('],['s',"'whatsapp.mensaje'"],['p',', '],['k','async'],['p',' (m) => {']],
    [['p','  '],['k','const'],['f',' hueco'],['p',' = '],['k','await'],['f',' agenda'],['p','.'],['f','libre'],['p','(m.hora)']],
    [['p','  '],['k','if'],['p',' (!hueco) '],['k','return'],['f',' m'],['p','.'],['f','sugerir'],['p','(agenda.'],['f','alternativas'],['p','())']],
    [],
    [['p','  '],['k','await'],['f',' reservas'],['p','.'],['f','crear'],['p','({ hueco, cliente: m.cliente })']],
    [['p','  '],['k','await'],['f',' m'],['p','.'],['f','responder'],['p','('],['s',"'Reserva confirmada'"],['p',')']],
    [['p','})']],
    [],
    [['c','// ✓ 21:30 · mesa 4 · enviado al cliente']],
  ];
  g.font=`500 38px ${MONO}`;
  L.forEach((line,i)=>{const y=150+i*64;g.fillStyle='#34363c';g.textAlign='right';g.fillText(String(i+1),96,y);g.textAlign='left';
    let x=140;line.forEach(([t,txt])=>{g.fillStyle=C[t];g.fillText(txt,x,y);x+=g.measureText(txt).width;});});
  // el cursor, el único acento
  g.fillStyle=C.a;g.fillRect(140+g.measureText('// ✓ 21:30 · mesa 4 · enviado al cliente').width+8,150+10*64-30,4,38);
  const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=8;return t;
}

/* ---------- lo común: fuentes, hormigón y entorno (una vez) ---------- */
let fuentesP=null,hormigonT=null,entornoP=null;
const fuentes=()=>fuentesP||(fuentesP=Promise.race([
  Promise.all(['400 22px','500 28px','600 34px'].map(f=>document.fonts.load(`${f} ${SANS}`).catch(()=>{}))).then(()=>document.fonts.ready),
  new Promise(r=>setTimeout(r,1500))]));
const hormigon=()=>hormigonT||(hormigonT=concreteTex(56));
function entorno(renderer){
  if(entornoP)return entornoP;
  const room=new RoomEnvironment(renderer);
  const hecho=e=>{room.dispose();return e;};
  entornoP=G.pmremEscena?G.pmremEscena(THREE,renderer,room,.04).then(hecho)
    :Promise.resolve().then(()=>{const pm=new THREE.PMREMGenerator(renderer);const e=pm.fromScene(room,.04).texture;pm.dispose();return hecho(e);});
  return entornoP;
}

/* ---------- estudio (luz común, sombras PCFSoft y suelo de sombra: el fondo es el color liso de la card) ---------- */
function studio(fondo,env){
  const scene=new THREE.Scene();scene.background=fondo.clone();scene.fog=new THREE.Fog(fondo,9,17);scene.environment=env;
  const floor=new THREE.Mesh(new THREE.PlaneGeometry(60,60),new THREE.ShadowMaterial({opacity:.55}));
  floor.rotation.x=-Math.PI/2;floor.receiveShadow=true;scene.add(floor);
  scene.add(new THREE.HemisphereLight(0xdfe3ea,0x0b0c0f,.22));
  const key=new THREE.DirectionalLight(0xfff3e6,3.0);key.position.set(-3,5.5,2.2);key.castShadow=true;
  key.shadow.mapSize.set(2048,2048);key.shadow.camera.left=-3;key.shadow.camera.right=3;key.shadow.camera.top=3;key.shadow.camera.bottom=-3;
  key.shadow.radius=4;key.shadow.bias=-.0004;key.shadow.normalBias=.02;scene.add(key);
  const rim=new THREE.DirectionalLight(0xcfe0ff,.55);rim.position.set(4,2.5,-4);scene.add(rim);
  const camera=new THREE.PerspectiveCamera(26,16/9,.1,60);
  return {scene,camera,luces:[key]};
}
function concreteBlock(w,h,d){
  const map=hormigon(),m=new THREE.MeshStandardMaterial({map,bumpMap:map,bumpScale:.6,roughness:.9,envMapIntensity:.35});
  const b=new THREE.Mesh(new RoundedBoxGeometry(w,h,d,3,.012),m);b.position.y=h/2;b.castShadow=b.receiveShadow=true;return b;
}

/* ---------- card 1: el móvil sobre el hormigón ---------- */
function seoScene(st){
  const {scene}=st;
  const block=concreteBlock(1.7,.62,1.35);block.position.set(0,0,0);block.rotation.y=-.5;scene.add(block);
  const phone=new THREE.Group();
  const W=.78,H=1.6,D=.07;
  const body=new THREE.Mesh(new RoundedBoxGeometry(W,H,D,6,.1),new THREE.MeshStandardMaterial({color:0x202125,metalness:.85,roughness:.32,envMapIntensity:1}));
  body.castShadow=true;body.receiveShadow=true;phone.add(body);
  const glass=new THREE.Mesh(new THREE.PlaneGeometry(W-.035,H-.035),new THREE.MeshPhysicalMaterial({color:0x050506,roughness:.08,metalness:0,clearcoat:1,clearcoatRoughness:.05,envMapIntensity:1.1}));
  glass.position.z=D/2+.0006;phone.add(glass);
  const scr=new THREE.Mesh(new THREE.PlaneGeometry(W-.07,H-.07),new THREE.MeshBasicMaterial({map:phoneScreen(),toneMapped:false}));
  scr.material.color.setScalar(.86);scr.position.z=D/2+.0012;phone.add(scr);
  // reflejo suave sobre el cristal
  const sheen=new THREE.Mesh(new THREE.PlaneGeometry(W-.07,H-.07),new THREE.MeshPhysicalMaterial({transparent:true,opacity:.18,roughness:.1,metalness:1,color:0xffffff,envMapIntensity:1,depthWrite:false}));
  sheen.position.z=D/2+.0018;phone.add(sheen);
  const island=new THREE.Mesh(new RoundedBoxGeometry(.2,.055,.004,2,.026),new THREE.MeshBasicMaterial({color:0x000000}));
  island.position.set(0,H/2-.085,D/2+.003);phone.add(island);
  // la cámara trasera (se ve por el canto)
  const bump=new THREE.Mesh(new RoundedBoxGeometry(.3,.3,.03,3,.06),body.material);bump.position.set(-.2,H/2-.24,-D/2-.012);phone.add(bump);
  phone.rotation.x=-Math.PI/2;phone.rotation.z=-.42;phone.position.set(.08,.62+D/2+.001,.05);
  phone.traverse(o=>{if(o.isMesh&&o!==scr&&o!==sheen&&o!==glass)o.castShadow=true;});
  scene.add(phone);
  st.camera.fov=24;
  st.subject=new THREE.Vector3(.05,.55,.1);st.dir=new THREE.Vector3(-.4,.8,.62).normalize();st.dist=5.0;
}

/* ---------- card 2: la pantalla y el teclado sobre el hormigón ---------- */
function iaScene(st){
  const {scene}=st;
  const block=concreteBlock(1.9,.62,1.35);block.rotation.y=-.5;scene.add(block);
  const top=.62;
  const g=new THREE.Group();
  const anod=new THREE.MeshStandardMaterial({color:0x1d1e21,metalness:.85,roughness:.38,envMapIntensity:.9});
  // panel de cristal ahumado sobre un pie negro
  const PW=1.34,PH=.84;
  const foot=new THREE.Mesh(new RoundedBoxGeometry(.62,.05,.26,3,.02),anod);foot.position.set(0,.025,-.32);g.add(foot);
  const neck=new THREE.Mesh(new RoundedBoxGeometry(.16,.22,.05,2,.015),anod);neck.position.set(0,.13,-.36);neck.rotation.x=-.12;g.add(neck);
  const panel=new THREE.Group();panel.position.set(0,.24+PH/2,-.38);panel.rotation.x=-.1;g.add(panel);
  const frame=new THREE.Mesh(new RoundedBoxGeometry(PW,PH,.028,4,.012),anod);panel.add(frame);
  const scr=new THREE.Mesh(new THREE.PlaneGeometry(PW-.05,PH-.05),new THREE.MeshBasicMaterial({map:codeTex(),toneMapped:false}));
  scr.material.color.setScalar(1.0);scr.position.z=.0145;panel.add(scr);
  const glass=new THREE.Mesh(new THREE.PlaneGeometry(PW-.02,PH-.02),new THREE.MeshPhysicalMaterial({color:0x000000,transparent:true,opacity:.22,roughness:.06,metalness:0,clearcoat:1,clearcoatRoughness:.04,envMapIntensity:1.4,depthWrite:false}));
  glass.position.z=.0152;panel.add(glass);
  // teclado bajo negro
  const kb=new THREE.Group();kb.position.set(-.02,0,.2);kb.rotation.y=.04;g.add(kb);
  const kbBase=new THREE.Mesh(new RoundedBoxGeometry(1.08,.035,.36,3,.012),anod);kbBase.position.y=.0175;kb.add(kbBase);
  const keyGeo=new RoundedBoxGeometry(.062,.016,.062,2,.008),keyMat=new THREE.MeshStandardMaterial({color:0x141518,roughness:.55,metalness:.2});
  const rows=[14,14,13,12],cnt=rows.reduce((a,b)=>a+b,0)+1;const keys=new THREE.InstancedMesh(keyGeo,keyMat,cnt);const m4=new THREE.Matrix4();let k=0;
  rows.forEach((n,r)=>{const off=r*.018;for(let i=0;i<n;i++){m4.makeTranslation(-.47+off+i*.0715,.043,-.12+r*.072);keys.setMatrixAt(k++,m4);}});
  const space=new THREE.Mesh(new RoundedBoxGeometry(.42,.016,.062,2,.008),keyMat);space.position.set(-.02,.043,-.12+4*.072);kb.add(space);
  keys.count=k;kb.add(keys);
  g.traverse(o=>{if(o.isMesh&&o!==scr&&o!==glass){o.castShadow=true;o.receiveShadow=true;}});
  g.position.set(.05,top,.02);g.rotation.y=-.38;scene.add(g);
  // una luz fría y muy débil de la pantalla sobre el hormigón
  const spill=new THREE.PointLight(0x9fb4c8,.5,1.6,2);spill.position.set(-.1,top+.5,0);scene.add(spill);
  st.subject=new THREE.Vector3(.05,.92,.0);st.dir=new THREE.Vector3(-.42,.58,.7).normalize();st.dist=5.9;st.off=.15;
}

/* ---------- pintar ---------- */
// El estado del renderer compartido para estas escenas (el del prototipo) y de vuelta al del bento.
function conEstudio(r,fn){
  const exp=r.toneMappingExposure,sh=r.shadowMap.enabled,ty=r.shadowMap.type;
  r.toneMappingExposure=1.0;r.shadowMap.enabled=true;r.shadowMap.type=THREE.PCFSoftShadowMap;
  try{return fn(r);}finally{r.toneMappingExposure=exp;r.shadowMap.enabled=sh;r.shadowMap.type=ty;}
}
// Cámara del prototipo: 'ancha' (la card de la home en escritorio: el objeto al tercio derecho,
// setViewOffset) o 'centrada' (≤ 860 px y servicios.html: clearViewOffset). En las cards altas de
// servicios.html (4:5, 1:1) la cámara se aleja lo justo para que el bodegón quepa de ancho.
function encuadre(st,w,h,modo){
  const ar=w/h;st.camera.aspect=ar;
  let d=st.dist*(modo==='ancha'?1:.92);
  if(modo==='centrada'&&ar<1.6)d*=Math.pow(1.6/ar,.75);
  st.camera.position.copy(st.subject).addScaledVector(st.dir,d);st.camera.lookAt(st.subject);
  if(modo==='ancha')st.camera.setViewOffset(w,h,-w*(st.off??.21),-h*.02,w,h);else st.camera.clearViewOffset();
  st.camera.updateProjectionMatrix();
}
// Tras pintar: fuera de la GPU las texturas y los mapas de sombra (la imagen ya está en el canvas 2D).
function liberar(st){
  const ts=new Set();st.scene.traverse(o=>{[].concat(o.material||[]).forEach(m=>['map','bumpMap'].forEach(k=>m[k]&&ts.add(m[k])));});
  ts.forEach(t=>t.dispose());st.luces.forEach(l=>{if(l.shadow.map){l.shadow.map.dispose();l.shadow.map=null;}});
}

export const bodegones=[];
const ESCENAS={seo:seoScene,ia:iaScene};

export async function bodegon(el,k,opts={}){
  const cv=el.querySelector('canvas'),g2=cv.getContext('2d',{alpha:false});
  const {renderer}=compartido();
  await fuentes();
  const env=await entorno(renderer);await G.cede();
  const fondo=new THREE.Color().setStyle(getComputedStyle(el).backgroundColor||'#070a13');
  const st=studio(fondo,env);ESCENAS[k](st);await G.cede();
  // shaders compilados en paralelo con el estado de estas escenas (sombras, exposición 1)
  const mats=conEstudio(renderer,r=>Array.from(r.compile(st.scene,st.camera)));
  await G.listo(renderer,mats);await G.cede();
  const enHome=!!el.closest('.que-hacemos'),estrecha=matchMedia('(max-width: 860px)');
  const modo=()=>enHome&&!estrecha.matches?'ancha':'centrada';
  let pw=0,ph=0,visto=false;
  const pinta=()=>{
    const r=cv.getBoundingClientRect(),d=Math.min(devicePixelRatio||1,2);
    const w=Math.max(1,r.width),h=Math.max(1,r.height),nw=Math.max(1,Math.floor(w*d)),nh=Math.max(1,Math.floor(h*d));
    if(nw===pw&&nh===ph&&cv.classList.contains('is-lista'))return;
    pw=nw;ph=nh;cv.width=pw;cv.height=ph;
    encuadre(st,w,h,modo());
    pintaEn(g2,pw,ph,rd=>conEstudio(rd,x=>x.render(st.scene,st.camera)));
    liberar(st);cv.classList.add('is-lista');
  };
  const ctx={el,k,st,pinta,capturar:(w,h,m)=>{const c=document.createElement('canvas');c.width=w;c.height=h;encuadre(st,w,h,m);
    pintaEn(c.getContext('2d',{alpha:false}),w,h,rd=>conEstudio(rd,x=>x.render(st.scene,st.camera)));liberar(st);pw=0;return c.toDataURL('image/png');}};
  bodegones.push(ctx);
  if(opts.captura){pinta();return ctx;}
  // una vez al entrar en pantalla; después, solo si cambia el tamaño
  let espera=0;
  new ResizeObserver(()=>{if(!visto)return;clearTimeout(espera);espera=setTimeout(pinta,150);}).observe(el);
  const io=new IntersectionObserver(es=>{if(!es.some(e=>e.isIntersecting))return;io.disconnect();visto=true;G.turno(pinta,1);});
  io.observe(el);
  return ctx;
}
