# Informe: oficina automática + listo para GitHub Pages (17-11-2026)

Los dos bloques están hechos y no se ha revertido nada. Las decisiones están en `DECISIONES.md` ("Tercera tanda autónoma").

## El repositorio: lee esto primero

- **Mientras yo trabajaba, cambiaste el remote `origin`** a tu repo nuevo `FINAL-EVIMES-PAGE-` (PÚBLICO, con GitHub Pages) e hiciste push de toda la historia y sus 35 tags. También hiciste el commit `1639b5d "Oficina automática"`, con mi trabajo a medias de ese momento.
- Mi `git push origin HEAD --tags` fue a ese repo y añadió los 2 últimos commits, que están limpios, y el tag `v-oficina-auto`.
- **La web ya está publicada y funciona:** https://patosarmientooscar.github.io/FINAL-EVIMES-PAGE-/
  - comprobado con Playwright a 390×844 tras el build de `bebe824`, con la oficina automática;
  - las 5 páginas responden 200;
  - CSS, fuentes, tubos y la oficina cargan;
  - 0 respuestas 404 y 0 errores.
- **Problema de privacidad:** ese repo público tiene la historia completa.
  - Los commits antiguos llevan escritos el email (`evimes@…`) y el teléfono que había en el código: 33 archivos a lo largo de la historia.
  - Los 36 commits llevan tu gmail como autor.
  - El código actual está limpio; la historia, no.
  - Por eso en la tanda anterior hice la versión pública aparte, `evimes-web-2026`, con solo fotos limpias.
  - Esto no lo he arreglado yo. Cambiar la visibilidad o borrar un repo público es decisión tuya, y reescribir la historia me lo bloqueó la protección de Claude Code.
- **Opciones:**
  1. **Dejarlo así.** El email y el teléfono son los del aviso legal de tu web actual, que ya son públicos allí. El gmail queda visible como autor.
  2. **Dejar una web pública sin historia:**
     1. borra o pon privado `FINAL-EVIMES-PAGE-` en GitHub (Settings → Danger Zone);
     2. créalo de nuevo VACÍO;
     3. ejecuta `git remote set-url publico https://github.com/patosarmientooscar/FINAL-EVIMES-PAGE-.git`;
     4. ejecuta `sh tools/publicar.sh "Evimes"`, que sube una foto limpia con tu email noreply;
     5. activa Pages: Settings → Pages → `main`, carpeta `/`.

     A partir de ahí, publica siempre con `tools/publicar.sh` y no con `git push`.
  3. **Usar `evimes-web-2026`,** que ya está limpio y con Pages: https://patosarmientooscar.github.io/evimes-web-2026/. Ahora enseña la versión anterior; para actualizarlo, ejecuta `sh tools/publicar.sh "oficina automática"`.
- Para que tus commits nuevos no lleven el gmail: `git config user.email "266553066+patosarmientooscar@users.noreply.github.com"` (solo en este repo).
- El repo privado `evimes-web` sigue existiendo, con la historia completa.
- Rutas: todas relativas, así que la web funciona en `/FINAL-EVIMES-PAGE-/`, en `/evimes-web/` o en el dominio propio.

## Lo que tienes que hacer tú

1. **Rellenar `js/config.js`:** `WEB3FORMS_KEY`, `whatsapp` y `email`; también `telefono` si lo quieres. El formulario no envía correos desde GitHub Pages hasta que pongas la clave de Web3Forms; con la clave, sí. El email y el teléfono de los textos legales salen también de ahí.
2. **Confirmar que los datos de PageSpeed** (`js/data/pagespeed.js`) **son de discoproduccion.com.**
3. **Revisar los textos BORRADOR** de `js/data/`.
4. **Probar la visita automática en tu móvil**, y decirme si 11 s te parecen bien o si "Saltar" tiene que salir antes o más grande.

## Bloque 1 · Oficina automática (`v-oficina-auto`)

- **La referencia no trae el código de la reproducción automática.** `Downloads/evimes-oficina/index.html` no tiene AUTOPLAY, startAuto ni finishAuto: su track es de 780vh y avanza con el scroll. La he construido siguiendo tu especificación.
- **Fases y cámara: las que ya tenía el proyecto**, como pedías. La referencia ha vuelto a la cámara que se acerca al monitor (fov 46), la que quitamos en la tanda anterior. No hay túnel ni flash porque el proyecto no los tiene desde que se aprobó la versión sin túnel.
- **Cómo funciona:**
  - **Track:** 240vh.
  - **idle:** la oficina es una card cerrada en el gris.
  - **play:** cuando el principio del track llega arriba, la página se queda quieta (`lenis.stop()` y bloqueo de rueda, toque y teclas de scroll) y la visita se reproduce sola, de 0 a 0,86 en 11 s.
  - **Avance rápido:** si intentas hacer scroll pasado 1,2 s, la visita acelera hasta ×4.
  - **"Saltar":** arriba a la derecha, de cristal oscuro y con scramble; también funciona con **Esc**. Lleva al final de la visita.
  - **Barra de progreso:** fina, abajo (#2b4dff → #00e5ff).
  - **done:** `lenis.start()`, y el resto del track solo hace el cierre, de 0,86 a 1 según el scroll.
- **Cuándo no se reproduce:**
  - con movimiento reducido (versión fija, sin bloqueo);
  - si se cruza la oficina con un salto de ancla (por ejemplo "Pide tu propuesta" → formulario);
  - si la página se carga por debajo de la oficina.
- **QA con Playwright, a 1440×900 y 390×844:**
  - al llegar, el scroll se queda exactamente en el principio del track y Lenis se para;
  - la rueda y las teclas (PageDown, Espacio) no mueven la página;
  - la rueda acelera la visita a unas 3 veces la velocidad normal en 0,5 s, y sigue subiendo hacia ×4;
  - "Saltar" lleva a 0,86 y desbloquea;
  - después el scroll hace el cierre hasta 1 y la página sigue hasta Contacto;
  - el salto a #contacto no la dispara;
  - con movimiento reducido no hay bloqueo;
  - **0 errores en consola.**
- **Capturas:** en `.playwright-mcp/oficina-auto/` (no se sube):
  - `1440-1-mitad.png` y `390-1-mitad.png`: en mitad de la visita, con "Saltar" y la barra;
  - `1440-2-final.png` y `390-2-final.png`: al final de la visita;
  - `1440-3-cierre.png` y `390-3-cierre.png`: después del cierre;
  - `reducido.png`: con movimiento reducido;
  - `hoja.png`: todas juntas.
- **De paso:** en móvil, las etiquetas de los indicadores de la oficina se cortaban dentro del círculo. Arreglado.

## Bloque 2 · Preparar la subida a GitHub

- **`.gitignore`:** `node_modules/`, `.env*`, `*.log`, `.DS_Store`, `Thumbs.db`, las carpetas de capturas (`.playwright-mcp/`, `test-results/`, `playwright-report/`) y `_respaldo/` (la copia local de la historia antigua).
- **`.nojekyll`:** en la raíz.
- **Revisión con grep** de todo lo que se sube (`@gmail`, `@hotmail`, `api_key`, `access_key`, `token`, `password` y teléfonos con +34 o 6/7 y 8 cifras): limpio.
  - El único resultado es `access_key: cfg.WEB3FORMS_KEY` en el formulario: es el nombre del campo de Web3Forms y lee la clave vacía de `config.js`.
  - `js/config.js` tiene todos los datos de contacto, las redes y la clave vacíos.
- **Rutas internas:** todas relativas; no hay ninguna que empiece por "/".
- **Commit y push:** commit "oficina automática + listo para GitHub Pages" y `git push origin HEAD --tags`. `origin` ya era tu repo público `FINAL-EVIMES-PAGE-` (ver arriba).

---

El informe de la tanda anterior (páginas propias, oficina de lejos, la primera publicación en GitHub Pages) está en la historia de git, tag `v-publicado`.
