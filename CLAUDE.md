# Evimes — "El Estudio"

Experiencia cinematográfica controlada por scroll: la cámara entra por la ventana de un edificio señorial de Madrid y recorre salas de cristal, una por servicio.

## Reglas del proyecto

- **Stack:** HTML + CSS + JS plano, Tailwind CDN, GSAP + ScrollTrigger, Lenis. Sin React, sin TypeScript, sin build step.
- **Diseño:** aplica SIEMPRE las skills `impeccable`, `design-taste-frontend` (taste-skill) y `high-end-visual-design`. Nivel del mejor estudio web del mundo. Nada puede parecer hecho por IA ni plantilla.
- **Backup obligatorio:** commit + tag de git al final de cada fase. Nunca toques la web antigua (solo lectura).
- **Cambios quirúrgicos:** no reescribas lo que ya funciona.
- **Animación:** anima solo `transform`, `opacity` y `clip-path`. Un único ticker (`gsap.ticker`) para todo (Lenis incluido).
- **Accesibilidad:** respeta `prefers-reduced-motion`. Contraste AA. `focus-visible` en todo lo interactivo. Idioma: español.
- **Imágenes generadas:** ningún texto, logo ni contenido de pantalla va dentro de ellas. Siempre HTML o SVG real encima.
- **Prohibido:** Inter / Roboto / Arial, degradados morados, emojis en la UI, eyebrow sobre cada título, "→" en todos los botones, fade-up en todo, tarjetas redondeadas genéricas.

## Estructura

- `js/config.js` — datos de contacto, redes, URLs.
- `js/content.js` — todos los textos de la web, por zona.
- `js/engine/` — motor de scroll.
- `js/zones/` — un archivo por zona.
- `js/game/` — juego del arcade.
- `assets/zones/NN-nombre/{desktop,mobile}/` — fotogramas/escenas por zona.
- `assets/screens/` — capturas o iframes de webs de clientes.

## Motor (fase 1)

- Orden del tick único: Lenis → `zones.flush` → `sequence.render` → `overlay.update` (ver `js/main.js`).
- Zonas y duraciones en `js/zones/manifest.js` (`ready: false` = placeholder en canvas).
- Fotogramas: `assets/zones/<slug>/<desktop|mobile>/0001.<ext>`.
- Pruebas: `?modo=fijo` / `?modo=cine` fuerza el modo; `?listo=pasillo:webp` marca una zona como lista sin tocar el manifiesto.
- Logo provisional en HTML ("EVIMES" en Libre Baskerville) hasta tener el SVG vectorial.
