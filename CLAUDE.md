# Evimes — "La oficina"

Home de una sola escena: la oficina de Evimes vista desde la silla del jefe (panorama 360°). El scroll la abre, saca los proyectos del monitor como cards, enseña las cifras en el techo y baja a las secciones planas (planes, servicios, preguntas, contacto). Ver BRIEF.md.

## Reglas del proyecto

- **Stack:** HTML + CSS + JS plano, GSAP + ScrollTrigger, Lenis, Three.js (solo para el panorama, cargado en diferido). Sin React, sin TypeScript, sin build step. Tailwind no se carga (no hay clases que lo usen y bloqueaba el LCP).
- **Diseño:** aplica SIEMPRE las skills `impeccable`, `design-taste-frontend` (taste-skill) y `high-end-visual-design`. Nivel del mejor estudio web del mundo. Nada puede parecer hecho por IA ni plantilla.
- **Backup obligatorio:** commit + tag de git al final de cada fase. Nunca toques la web antigua (solo lectura).
- **Cambios quirúrgicos:** no reescribas lo que ya funciona.
- **Animación:** anima solo `transform`, `opacity` y `clip-path`. Un único ticker (`gsap.ticker`) para todo (Lenis incluido).
- **Accesibilidad:** respeta `prefers-reduced-motion` (versión fija). Contraste AA. `focus-visible` en todo lo interactivo. Idioma: español.
- **Imágenes generadas:** ningún texto, logo ni contenido de pantalla va dentro. Siempre HTML o SVG real encima. (El logo grabado en la pared del panorama es la excepción aceptada: no se añade otro encima.)
- **Sin vídeo:** nada de vídeos generados ni secuencias de fotogramas. Super clean: si algo no queda perfecto, se quita y se dice.
- **Nada inventado:** ni clientes, ni cifras, ni garantías. Las píldoras y cifras salen de mediciones reales (`js/data/mediciones.js`).
- **Prohibido:** Inter / Roboto / Arial, degradados morados, emojis en la UI, "→" en todos los botones, fade-up en todo, tarjetas genéricas de icono + título + texto.
- **Legales:** no cambiar ni una palabra del texto legal.

## Estructura

- `index.html` — hero + oficina (zona pinned) + secciones planas.
- `js/config.js` — contacto, WhatsApp, cifras y TODA la geometría de la oficina (paradas, monitor, detalles vivos).
- `js/content.js` — todos los textos (editables).
- `js/data/proyectos.js`, `js/data/planes.js`, `js/data/mediciones.js` — datos editables.
- `js/engine/` — motor: `util`, `lenis`, `stage`, `zones`, `overlay` (scrim, matrix3d), `pano` (Three.js).
- `js/zones/oficina.js` — la escena (cámara, cards, cifras, detalles vivos). `js/secciones.js` — secciones planas. `js/header.js` — menú y anclas.
- `css/fonts.css` (fuentes alojadas en `assets/fonts/`), `tokens.css`, `base.css`, `engine.css`, `oficina.css`, `doc.css` + `paginas.css` (páginas planas y legales).
- `tools/render-hero.sh` — renders planos del panorama (ffmpeg v360). `tools/serve.js` — servidor local.
- `_archivo/idea-estudio/` — la idea anterior completa. No se carga.

## Motor

- Tick único: Lenis → `zones.flush` → `stage.render` (cámara + panorama + capas) → `overlay.update` (scrims).
- Zona `oficina` (manifest: 7 pantallas de pin). Tramos de progreso en `oficina.js` (constante `P`): apertura 0–0.10 · a mesa 0.10–0.17 · vuelo de cards 0.17–0.37 · arco quieto · a techo 0.52–0.62 · cifras 0.62–0.84 · salida a navy 0.84–1.
- Three.js 0.160 se importa al primer gesto de scroll (`EV.pano.load`). El hero no lo necesita. Pasada la oficina se libera el panorama (dispose).
- Proyección: `oficina.js` tiene su propio proyector, idéntico a la cámara de Three (lookAt sin alabeo). Todo lo pegado al panorama (miniaturas, huecos, reflejo, pantallas del equipo, vapor) usa la cámara final de `view.render()`: no baila.
- Cards: cada card es UN elemento; su posición son 4 esquinas interpoladas entre la miniatura del monitor y su sitio en el arco (homografía → matrix3d). Muelle 170/22 por card.
- Costura y silla: `EV.oficina.check()` recorre todo el scroll (con la mirada a tope) y devuelve el yaw y el pitch más extremos que llegan a verse.
- `?ajustar=oficina`: "Mirar" → arrastrar para girar, rueda = fov, clic = copia (yaw, pitch); marca monitor, pantallas, taza…
- `?modo=fijo` / `?modo=cine` fuerza el modo. Versión fija con movimiento reducido, conexión lenta o sin WebGL: foto plana + cards en rejilla + cifras en fila.
- Logos vectoriales en `assets/logo/` (no retocar). Se montan con `data-logo="<clave>"` (js/brand.js). Los `evimes-navy-*` / `evimes-grey-*` / `evimes-logo-animado` son PNG metidos en SVG: no usarlos.
- Efectos de luz y desenfoques: pintados una vez (canvas, WebGL o filtro estático). Nada de `filter` CSS animado en vivo.
- Ojo: `img { max-width: 100% }` global. Imágenes con tamaño propio dentro de capas escaladas necesitan `max-width: none`.
- Ojo: Schibsted con `tabular-nums` ensancha la coma ("0 , 7"). No usarlo donde haya decimales.
