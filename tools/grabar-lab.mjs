// ============================================================================
// grabar-lab.mjs — las vistas previas del índice del laboratorio (laboratorio.html):
// un clip de 5 s de cada experimento en movimiento, sin texto ni interfaz.
//
//   PLAYWRIGHT=<ruta a node_modules/playwright> node tools/grabar-lab.mjs [ondas red destello oficina] [--solo-codificar]
//   (con el servidor local en marcha: node tools/serve.js 5173)
//
// · Tiempo virtual (page.clock): cada fotograma avanza 1000/30 ms exactos y se
//   captura con CDP (Page.captureScreenshot), como tools/record-disco.mjs.
// · La página se abre con ?captura (css/lab.css oculta cabecera, ficha, enlaces y grano).
// · Bucle sin salto: se graban 5,5 s y el último medio segundo funde con el
//   principio (xfade): el clip acaba justo donde empieza.
// · La red: un cursor (invisible) da vueltas por el centro y la red reacciona.
// · La oficina: la cámara a mano con su propia captura (ida y vuelta al monitor).
// · Salida: assets/lab/<nombre>.mp4 (H.264, CRF 26, sin audio, +faststart; rango de color limitado:
//   con el completo de los JPG, Chrome no decodifica el VP9),
//   .webm (VP9) a 640 × 400 y el póster (primer fotograma) en .avif y .webp.
// · Si un experimento tarda más de 10 minutos o falla, se queda solo con su
//   póster (una captura fija) y se avisa. Sin reintentos.
// ============================================================================
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const FOTOS = path.join(RAIZ, 'tools', 'frames', 'lab');
const SALIDA = path.join(RAIZ, 'assets', 'lab');
const BASE = process.env.LAB_URL || 'http://localhost:5173/';
const FPS = 30, DURA = 5, FUNDE = 15, W = 1280, H = 800;
// fotogramas del clip (sin el fundido): 5 s, salvo si el movimiento tiene un periodo que cabe (así el final es el principio)
const cuadros = k => EXP[k].cuadros || FPS * DURA;
const MAX_MIN = 10, LIMITE = 600 * 1024;

// cada experimento: su URL, cuándo está listo, qué hacer antes de grabar y en cada fotograma
const EXP = {
  ondas: {
    // Tijera: periódica, 2π / 1,3 = 4,83 s (145 fotogramas): el final coincide con el principio; y compacta,
    // así que las piezas pueden ir grandes en el cuadro de 320 × 200
    url: 'laboratorio/ondas.html?captura&mov=tijera',
    cuadros: 145,
    // con el reloj virtual el bucle de la web va a saltos (y ~2,4 veces más rápido): pasos fijos con su propia función
    paso: dt => window.EvimesOndas.__step(dt),
    listo: () => !!window.__ondasReady && !!document.querySelector('.lab-movs button'),
    preparar: async page => { await page.evaluate(() => { document.querySelector('[data-ondas]').dataset.ondasScale = '2.2'; }); },
    calentar: 2500
  },
  red: {
    url: 'laboratorio/red.html?captura',
    listo: () => document.documentElement.classList.contains('red-viva'),
    gesto: true,
    // a 640 × 400 (× 2): la red a la escala del cuadro de la vista previa (sus celdas de 24 px y el radio de 170 px se ven grandes)
    vista: { w: 640, h: 400, dsf: 2 },
    // una elipse por el centro: una vuelta cada 5 s (lo que dura el clip)
    cursor: s => { const a = s / DURA * Math.PI * 2; return [320 + Math.cos(a) * 640 * .26, 200 + Math.sin(a * 2) * 400 * .2]; },
    calentar: 5000
  },
  destello: {
    url: 'laboratorio/destello.html?captura',
    listo: () => typeof window.__labPaso === 'function',
    paso: dt => window.__labPaso(dt),
    calentar: 1200
  },
  oficina: {
    // la visita automática va por tiempo y el reloj virtual no la lleva a su ritmo: la cámara se pone a mano con la
    // captura de la propia oficina (?oficina=captura → window.__oficinaCaptura(p), su render sin la card ni textos).
    // Ida y vuelta suave entre la vista amplia y el monitor (el movimiento de cámara de la visita, P .2 → .5):
    // periódica, así que el bucle cierra sin salto.
    url: 'laboratorio/oficina.html?captura&oficina=captura',
    listo: () => typeof window.__oficinaCaptura === 'function',
    camara: u => .2 + .3 * (1 - Math.cos(u * Math.PI * 2)) / 2,
    calentar: 0
  }
};

function ff(args) { execFileSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', ...args], { stdio: 'inherit' }); }

function codificar(k) {
  const N = cuadros(k) + FUNDE;
  const ent = path.join(FOTOS, k, '%04d.jpg');
  const fin = (N - FUNDE) / FPS - FUNDE / FPS;      // dónde empieza el fundido del final con el principio
  const filtro = `[0:v]scale=640:400:force_original_aspect_ratio=increase:flags=lanczos:out_range=tv,crop=640:400,format=yuv420p,split[a][b];[a]trim=start_frame=${FUNDE},setpts=PTS-STARTPTS[m];` +
    `[b]trim=end_frame=${FUNDE},setpts=PTS-STARTPTS[h];[m][h]xfade=transition=fade:duration=${FUNDE / FPS}:offset=${fin.toFixed(3)},format=yuv420p[v]`;
  const mp4 = path.join(SALIDA, k + '.mp4'), webm = path.join(SALIDA, k + '.webm');
  let crf = 26;
  ff(['-framerate', String(FPS), '-i', ent, '-filter_complex', filtro, '-map', '[v]', '-an', '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-color_range', 'tv', '-preset', 'slow', '-crf', String(crf), '-movflags', '+faststart', mp4]);
  while (fs.statSync(mp4).size > LIMITE && crf < 34) {     // por encima de 600 KB: un punto más de compresión
    crf += 2;
    ff(['-framerate', String(FPS), '-i', ent, '-filter_complex', filtro, '-map', '[v]', '-an', '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-color_range', 'tv', '-preset', 'slow', '-crf', String(crf), '-movflags', '+faststart', mp4]);
  }
  let crfW = 36;
  ff(['-framerate', String(FPS), '-i', ent, '-filter_complex', filtro, '-map', '[v]', '-an', '-c:v', 'libvpx-vp9', '-pix_fmt', 'yuv420p', '-color_range', 'tv', '-b:v', '0', '-crf', String(crfW), '-row-mt', '1', '-deadline', 'good', webm]);
  while (fs.statSync(webm).size > LIMITE && crfW < 48) {
    crfW += 4;
    ff(['-framerate', String(FPS), '-i', ent, '-filter_complex', filtro, '-map', '[v]', '-an', '-c:v', 'libvpx-vp9', '-pix_fmt', 'yuv420p', '-color_range', 'tv', '-b:v', '0', '-crf', String(crfW), '-row-mt', '1', '-deadline', 'good', webm]);
  }
  // el póster: el primer fotograma del clip (el fotograma FUNDE de la grabación)
  poster(k, path.join(FOTOS, k, String(FUNDE).padStart(4, '0') + '.jpg'));
  return { mp4: fs.statSync(mp4).size, webm: fs.statSync(webm).size, crf, crfW };
}

function poster(k, jpg) {
  ff(['-i', jpg, '-vf', 'scale=640:400:force_original_aspect_ratio=increase:flags=lanczos:out_range=tv,crop=640:400', '-frames:v', '1', '-c:v', 'libwebp', '-quality', '82', path.join(SALIDA, k + '.webp')]);
  ff(['-i', jpg, '-vf', 'scale=640:400:force_original_aspect_ratio=increase:flags=lanczos,crop=640:400,format=yuv420p', '-frames:v', '1', '-c:v', 'libaom-av1', '-still-picture', '1', '-crf', '32', path.join(SALIDA, k + '.avif')]);
}

async function grabar(chromium, k) {
  const N = cuadros(k) + FUNDE;
  const e = EXP[k], dir = path.join(FOTOS, k);
  fs.mkdirSync(dir, { recursive: true });
  for (const f of fs.readdirSync(dir)) if (/^\d{4}\.jpg$/.test(f)) fs.unlinkSync(path.join(dir, f));
  const t0 = Date.now(), tarde = () => (Date.now() - t0) / 60000 > MAX_MIN;
  const navegador = await chromium.launch({ headless: true, args: ['--ignore-gpu-blocklist', '--enable-gpu', '--use-angle=d3d11', '--hide-scrollbars'] });
  let ultimo = null;
  try {
    const v = e.vista || { w: W, h: H, dsf: 1 };
    const contexto = await navegador.newContext({ viewport: { width: v.w, height: v.h }, deviceScaleFactor: v.dsf, reducedMotion: 'no-preference' });
    const page = await contexto.newPage();
    const errores = [];
    page.on('pageerror', x => errores.push(x.message));
    await page.clock.install();
    await page.goto(BASE + e.url, { waitUntil: 'domcontentloaded', timeout: 60000 });
    const cdp = await contexto.newCDPSession(page);
    const foto = async () => (await cdp.send('Page.captureScreenshot', { format: 'jpeg', quality: 92 })).data;

    // hasta que esté listo: el tiempo virtual avanza a la par que el real (las descargas van en tiempo real)
    let xy = e.cursor ? e.cursor(0) : null;
    for (;;) {
      if (tarde()) throw new Error('no arranca en ' + MAX_MIN + ' minutos');
      if (e.gesto) { await page.mouse.move(xy[0] - 20, xy[1]); await page.mouse.move(xy[0], xy[1]); }
      await page.clock.runFor(100);
      await page.waitForTimeout(100);
      if (await page.evaluate(e.listo)) break;
    }
    if (e.css) await page.addStyleTag({ content: e.css });
    if (e.preparar) await e.preparar(page);
    // a ritmo: el calentamiento (los muelles en su sitio; la red, una vuelta entera)
    const pasos = Math.round(e.calentar / (1000 / FPS));
    for (let i = 0; i < pasos; i++) {
      if (e.cursor) { xy = e.cursor((i - pasos) / FPS); await page.mouse.move(xy[0], xy[1]); }
      if (e.paso) await page.evaluate(e.paso, 1 / FPS); else await page.clock.runFor(1000 / FPS);
    }
    ultimo = await foto();
    let t = 0;
    for (let i = 0; i < N; i++) {
      if (tarde()) throw new Error(`pasa de ${MAX_MIN} minutos: parada en el fotograma ${i}`);
      if (e.camara) {
        const jpg = await page.evaluate(p => new Promise(fin => { const im = new Image(); im.onload = () => { const c = document.createElement('canvas'); c.width = im.width; c.height = im.height; c.getContext('2d').drawImage(im, 0, 0); fin(c.toDataURL('image/jpeg', .92).split(',')[1]); }; im.src = window.__oficinaCaptura(p).img; }), e.camara(i / cuadros(k)));
        ultimo = jpg;
        fs.writeFileSync(path.join(dir, String(i).padStart(4, '0') + '.jpg'), Buffer.from(jpg, 'base64'));
        continue;
      }
      if (e.cursor) { xy = e.cursor(i / FPS); await page.mouse.move(xy[0], xy[1]); }
      if (e.paso) {
        await page.evaluate(e.paso, 1 / FPS);
        ultimo = await foto();
        fs.writeFileSync(path.join(dir, String(i).padStart(4, '0') + '.jpg'), Buffer.from(ultimo, 'base64'));
        continue;
      }
      const t1 = Math.round((i + 1) * 1000 / FPS);
      await page.clock.runFor(t1 - t);
      t = t1;
      ultimo = await foto();
      fs.writeFileSync(path.join(dir, String(i).padStart(4, '0') + '.jpg'), Buffer.from(ultimo, 'base64'));
    }
    if (errores.length) console.warn(`[${k}] errores en la página:`, errores);
    return { ok: true, min: ((Date.now() - t0) / 60000).toFixed(1) };
  } catch (err) {
    // sin clip: su póster como imagen fija (la última captura que haya)
    if (ultimo) {
      const jpg = path.join(dir, 'poster.jpg');
      fs.writeFileSync(jpg, Buffer.from(ultimo, 'base64'));
      poster(k, jpg);
    }
    return { ok: false, error: String(err && err.message || err), poster: !!ultimo };
  } finally {
    // cerrar el navegador sin GPU puede quedarse colgado: con un tope de 10 s
    await Promise.race([navegador.close().catch(() => {}), new Promise(r => setTimeout(r, 10000))]);
  }
}

const pwRuta = process.env.PLAYWRIGHT || 'playwright';
const pw = await import(fs.existsSync(pwRuta) ? pathToFileURL(path.join(pwRuta, 'index.mjs')).href : pwRuta);
const chromium = pw.chromium || pw.default.chromium;
fs.mkdirSync(SALIDA, { recursive: true });
const cuales = process.argv.slice(2).filter(x => x in EXP);
// --solo-codificar: con los fotogramas ya grabados (tools/frames/lab/<k>/)
const soloCodificar = process.argv.includes('--solo-codificar');
const informe = {};
for (const k of cuales.length ? cuales : Object.keys(EXP)) {
  const r = soloCodificar ? { ok: true } : await grabar(chromium, k);
  informe[k] = r.ok ? { ...r, ...codificar(k) } : r;
  console.log(k, JSON.stringify(informe[k]));
}
fs.writeFileSync(path.join(FOTOS, 'informe.json'), JSON.stringify(informe, null, 2));
process.exit(0);
