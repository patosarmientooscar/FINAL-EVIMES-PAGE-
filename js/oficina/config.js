/* ==========================================================================
   oficina/config.js — rutas, puntos de la foto y proyectos.
   Prototipo aprobado: Downloads/evimes-oficina/index.html (valores tal cual).
   ========================================================================== */

// El panorama (equirectangular 2896×1440, Higgsfield). UNA sola constante:
// aquí se cambiará por la versión 4K. Copia en JPG al lado (oficina-lejos.jpg).
export const PANO = 'assets/oficina/oficina-lejos.webp';

// Los vectores reales (el prototipo los llevaba en línea).
export const LOGO = { eh: 'assets/logo/evimes-eh.svg', wordmark: 'assets/logo/evimes-wordmark.svg' };

// where things are in the photo (yaw + right, pitch + up, degrees)
export const SPOT = { monitor: { tl: [-15.6, 3.7], tr: [22.1, 3.7], br: [22.1, -15.9], bl: [-15.6, -15.9] }, mug: [46.2, -12], wall: [7.7, 24.5] };

// projects: only real ones; "soon" cards say so honestly. Datos: js/data/proyectos.js
export const PROJECTS = (window.EVIMES_TRABAJO || []).map(p => ({
  title: p.title, sub: p.sub, img: p.img || null, url: p.url || null, soon: !!p.soon, hue: p.hue || 0
}));

// Versión fija (movimiento reducido, ahorro de datos, ?modo=fijo): la foto de la
// oficina sacada del propio render (P = 0.78, sin cards) y dónde caen las cards
// encima del monitor, en % de la imagen (centro de cada card en el render, 88 %
// del ancho y 94 % del alto de su caja: las cards en 3D van giradas). Se rehacen con ?oficina=captura.
export const FIJA = {
  escritorio: { img: 'assets/oficina/oficina-fija.webp', ar: 1920 / 1080, cards: [{x:19.62,y:20.87,w:14.32,h:29.26},{x:35.77,y:21.68,w:12.41,h:26.37},{x:50.66,y:21.49,w:12.44,h:26.94},{x:64.66,y:22.5,w:13.39,h:27.35}] },
  movil: { img: 'assets/oficina/oficina-fija-movil.webp', ar: 390 / 844, cards: [{x:6.5,y:14.28,w:37.95,h:17.61},{x:49.73,y:15.4,w:35.03,h:16.92},{x:5.13,y:34.15,w:39.42,h:20.51},{x:51.86,y:33.75,w:39.63,h:21.07}] }
};
