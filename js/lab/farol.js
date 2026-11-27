/* Farol: el agente IA del laboratorio. Una linterna de cerámica blanca que flota sobre un aro de luz naranja.
   Vive en su propia escena y se dibuja DESPUÉS de la sala (y de la foto 360°), así siempre queda encima de la foto
   pero respeta la profundidad de la sala 3D.
   Uso:
     const farol = createFarol({ THREE, RoundedBoxGeometry, RoomEnvironment, renderer, at: P(0, 16.2, .18), scale: 1.7 });
     en el bucle:  renderer.render(scene, cam); farol.render(cam, dt);
     estados:      farol.setState('idle' | 'think' | 'talk')                                                    */
export function createFarol({ THREE, RoundedBoxGeometry, RoomEnvironment, renderer, at, scale = 1.7 }) {
  const scene = new THREE.Scene();
  const pm = new THREE.PMREMGenerator(renderer);
  scene.environment = pm.fromScene(new RoomEnvironment(renderer), .04).texture; pm.dispose();
  scene.environmentIntensity = .5;

  // its own light: the warm-orange spot of the platform from above, a cool fill and a soft sky
  const key = new THREE.SpotLight(0xffc89a, 9, 6, .6, .7, 1.6); key.position.set(0, 3, .5); key.target.position.set(0, .9, 0);
  const fill = new THREE.DirectionalLight(0xbcd0ff, .3); fill.position.set(-2, 1.5, 3);
  scene.add(key, key.target, fill, new THREE.HemisphereLight(0xfff1e2, 0x2a1d14, .35));

  const M = {
    shell: new THREE.MeshPhysicalMaterial({ color: 0xf3f1ec, roughness: .32, clearcoat: 1, clearcoatRoughness: .18, sheen: .3, sheenColor: new THREE.Color(0xffffff) }),
    visor: new THREE.MeshPhysicalMaterial({ color: 0x07080a, roughness: .08, metalness: .1, clearcoat: 1, clearcoatRoughness: .04 }),
    trim: new THREE.MeshStandardMaterial({ color: 0xd9d6cf, roughness: .5, metalness: .2 }),
    dark: new THREE.MeshStandardMaterial({ color: 0x24262a, roughness: .45, metalness: .5 }),
  };
  const root = new THREE.Group(); root.position.copy(at); root.scale.setScalar(scale); scene.add(root);
  const bot = new THREE.Group(); root.add(bot);            // floats
  const head = new THREE.Group(); bot.add(head);           // turns toward you
  head.add(new THREE.Mesh(new RoundedBoxGeometry(.46, .5, .42, 8, .15), M.shell));
  const handle = new THREE.Mesh(new THREE.TorusGeometry(.085, .013, 12, 48, Math.PI), M.trim); handle.position.y = .25; head.add(handle);
  for (const s of [-1, 1]) { const k = new THREE.Mesh(new THREE.CylinderGeometry(.02, .02, .02, 20), M.trim); k.position.set(s * .085, .25, 0); head.add(k); }
  for (const s of [-1, 1]) {                               // side dials
    const d = new THREE.Mesh(new THREE.CylinderGeometry(.055, .055, .02, 40), M.trim); d.rotation.z = Math.PI / 2; d.position.set(s * .232, .03, 0); head.add(d);
    const c = new THREE.Mesh(new THREE.CylinderGeometry(.03, .03, .024, 32), M.dark); c.rotation.z = Math.PI / 2; c.position.set(s * .236, .03, 0); head.add(c);
  }
  const visor = new THREE.Mesh(new RoundedBoxGeometry(.38, .16, .06, 6, .05), M.visor); visor.position.set(0, .04, .19); head.add(visor);

  // the light on the visor: two eyes that look at you, blink and pulse when talking; an orange wave when thinking
  const U = { uT: { value: 0 }, uMode: { value: 0 }, uBlink: { value: 0 }, uTalk: { value: 0 }, uLook: { value: new THREE.Vector2() } };
  const face = new THREE.Mesh(new THREE.PlaneGeometry(.34, .13), new THREE.ShaderMaterial({
    uniforms: U, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false,
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: `uniform float uT, uMode, uBlink, uTalk; uniform vec2 uLook; varying vec2 vUv;
      float capsule(vec2 p, vec2 a, vec2 b, float r){ vec2 pa = p - a, ba = b - a; float h = clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0); return length(pa - ba * h) - r; }
      void main(){
        vec2 p = (vUv - 0.5) * vec2(0.34, 0.13);
        vec3 warm = vec3(1.0, 0.86, 0.68), orange = vec3(1.0, 0.45, 0.12);
        float open = 1.0 - uBlink; float h = 0.018 * open * (1.0 + 0.25 * uTalk) + 0.002;
        vec2 off = uLook * vec2(0.022, 0.012);
        float e = 1e3;
        for (int i = 0; i < 2; i++) { float x = (i == 0 ? -0.055 : 0.055); e = min(e, capsule(p - off, vec2(x, -h), vec2(x, h), 0.011)); }
        float eyes = smoothstep(0.004, -0.002, e) + 0.35 * smoothstep(0.03, 0.0, e);
        float x = p.x / 0.17; float ph = fract(uT * 0.6) * 2.8 - 1.4;
        float band = exp(-pow((x - ph) * 2.6, 2.0));
        float line = smoothstep(0.009, 0.0, abs(p.y - 0.016 * sin(x * 7.0 - uT * 6.0)));
        float wave = band * (line * 1.4 + 0.25 * smoothstep(0.06, 0.0, abs(p.y)));
        float thinking = smoothstep(0.5, 1.0, uMode);
        vec3 col = warm * eyes * (1.0 - 0.9 * thinking) + orange * wave * 2.4 * thinking;
        float edge = smoothstep(0.0, 0.012, 0.065 - abs(p.y)) * smoothstep(0.0, 0.02, 0.17 - abs(p.x));
        gl_FragColor = vec4(col * edge, 1.0);
      }` }));
  face.position.set(0, .04, .2205); head.add(face);
  const eyeLight = new THREE.PointLight(0xffb27a, 0, .7, 2); eyeLight.position.set(0, -.18, .42); head.add(eyeLight);

  // the ring of light it floats on, and the pool it throws on the platform
  const ring = new THREE.Mesh(new THREE.TorusGeometry(.13, .012, 16, 96), new THREE.MeshBasicMaterial({ color: 0xff8a3a, toneMapped: false }));
  ring.rotation.x = Math.PI / 2; ring.position.y = -.31; bot.add(ring);
  const cap = new THREE.Mesh(new THREE.CylinderGeometry(.1, .14, .04, 48), M.trim); cap.position.y = -.27; bot.add(cap);
  const under = new THREE.PointLight(0xff7a22, 2.2, 1.6, 2); under.position.y = -.4; bot.add(under);
  const c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d');
  const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64); gr.addColorStop(0, 'rgba(255,140,60,.9)'); gr.addColorStop(.4, 'rgba(255,120,40,.25)'); gr.addColorStop(1, 'rgba(255,120,40,0)');
  g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
  const pool = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 1.1), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(c), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false }));
  pool.rotation.x = -Math.PI / 2; pool.position.y = .005; root.add(pool);

  const HOVER = .62;                                         // floating height over the platform (before scale)
  let state = 'idle', modeT = 0, talkT = 0, blinkAt = 2, blinkK = 0, t = 0;
  const mouse = new THREE.Vector2(), look = new THREE.Vector2(), toCam = new THREE.Vector3();
  addEventListener('pointermove', e => mouse.set(e.clientX / innerWidth * 2 - 1, -(e.clientY / innerHeight * 2 - 1)), { passive: true });
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const ac = renderer.autoClear;

  function render(cam, dt) {
    if (cam.position.distanceTo(root.position) > 12) return;  // far away: skip (it can't be seen)
    t += dt; const k = 1 - Math.exp(-dt * 4);
    const amp = reduce ? 0 : (state === 'think' ? .05 : .035);
    bot.position.y = HOVER + Math.sin(t * 1.3) * amp; bot.rotation.z = reduce ? 0 : Math.sin(t * .9) * .03;
    // the body turns to face the camera; the head follows the cursor on top of that
    toCam.subVectors(cam.position, root.position); root.rotation.y += (Math.atan2(toCam.x, toCam.z) - root.rotation.y) * k;
    look.lerp(mouse, k); head.rotation.y = look.x * .45; head.rotation.x = -look.y * .22;
    modeT += ((state === 'think' ? 1 : 0) - modeT) * (1 - Math.exp(-dt * 5));
    talkT = state === 'talk' ? .5 + .5 * Math.sin(t * 14) * Math.sin(t * 3.1) : talkT * .9;
    if (t > blinkAt) { blinkK += dt * 9; if (blinkK >= 2) { blinkK = 0; blinkAt = t + 2.5 + Math.random() * 3; } }
    U.uT.value = t; U.uMode.value = modeT; U.uTalk.value = talkT; U.uLook.value.copy(look);
    U.uBlink.value = state === 'think' ? 0 : (blinkK < 1 ? blinkK : 2 - blinkK);
    eyeLight.intensity = .08 + modeT * .35 + talkT * .12;
    ring.material.color.setHSL(.07, 1, .55 + .08 * Math.sin(t * (state === 'think' ? 6 : 2)));
    under.intensity = 2.2 + Math.sin(t * 1.3) * .4 + modeT * 1.2;
    const lift = bot.position.y - HOVER; pool.scale.setScalar(1 - lift * 2.5); pool.material.opacity = .85 - lift * 3;
    renderer.autoClear = false; renderer.render(scene, cam); renderer.autoClear = ac;   // on top of the room, keeping its depth
  }
  return { scene, root, render, setState: s => { state = s; }, get state() { return state; } };
}
