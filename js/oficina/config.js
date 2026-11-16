/* ==========================================================================
   oficina/config.js — rutas, puntos de la foto y el proyecto (Disco).
   ========================================================================== */

// El panorama (equirectangular, Higgsfield). 4336×2160 en escritorio; 4096×2048
// en móvil o si la GPU no admite texturas de 8192 (gl.MAX_TEXTURE_SIZE < 8192:
// 4336 no cabe en 4096). WebP q88; los JPG originales están al lado.
export const PANO = { grande: 'assets/oficina/oficina-4k.webp', normal: 'assets/oficina/oficina-4096.webp' };
export const elegirPano = (maxTextura, movil) => (!movil && maxTextura >= 8192 ? PANO.grande : PANO.normal);

// Los vectores reales.
export const LOGO = { eh: 'assets/logo/evimes-eh.svg', wordmark: 'assets/logo/evimes-wordmark.svg' };

// Dónde está cada cosa en la foto (yaw + derecha, pitch + arriba, grados).
// Medido en oficina-4k: la pantalla (sin el marco de abajo), la boca de la taza
// y el centro de la pared navy.
export const SPOT = {
  monitor: { tl: [-15.9, 3.6], tr: [22.2, 3.6], br: [22.2, -15.7], bl: [-15.9, -15.7] },
  mug: [46.7, -17.4],
  wall: [7.7, 24.5]
};

// El proyecto que sale del monitor. strip: 4 capturas reales de la web
// apiladas en vertical (1024×640 cada una); la card las recorre.
export const PROJECT = {
  title: 'Disco Producción',
  url: 'https://discoproduccion.com',
  strip: 'assets/proyectos/disco-strip.webp',
  frames: 4,
  frameAr: 1024 / 640
};

// Versión fija (movimiento reducido, ahorro de datos, ?modo=fijo, sin WebGL):
// la oficina sacada del propio render (sin la card) y dónde cae la card de
// Disco, en % de la imagen (16:10 centrado en la caja proyectada de la card en P = 0.76).
// Se rehacen con ?oficina=captura → window.__oficinaCaptura(.76).
export const FIJA = {
  escritorio: { img: 'assets/oficina/oficina-fija.webp', ar: 1920 / 1080, card: {"x":46.2,"y":23.77,"w":24.07,"h":26.74} },
  movil: { img: 'assets/oficina/oficina-fija-movil.webp', ar: 390 / 844, card: {"x":10.56,"y":32,"w":75.5,"h":21.81} }
};
