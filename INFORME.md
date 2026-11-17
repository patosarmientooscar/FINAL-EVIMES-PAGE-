# Informe: oficina automática + listo para GitHub Pages (17-11-2026)

Los dos bloques están hechos y no se ha revertido nada. Las decisiones están en `DECISIONES.md` ("Tercera tanda autónoma").

## Antes de crear el repositorio: importante

- **El remote `origin` ya existe:** es `github.com/patosarmientooscar/evimes-web`, PRIVADO, que creé en la primera tanda. Como pide el prompt, he hecho `git push origin HEAD --tags` ahí.
- **No hagas público ese repositorio.** Su historia (los commits antiguos) lleva el email y el teléfono que había en el código, y todos los commits llevan tu gmail como autor. El código actual está limpio; la historia, no.
- **Para la web pública ya existe `evimes-web-2026`**, de la tanda anterior. Es PÚBLICO, tiene GitHub Pages activado y solo tiene "fotos" limpias del código:
  - **Web:** https://patosarmientooscar.github.io/evimes-web-2026/ (aún enseña la versión anterior, sin la oficina automática).
  - **Para actualizarla con esta versión:** `sh tools/publicar.sh "oficina automática"`. No lo he hecho porque esta vez el prompt solo permitía push a `origin`.
- **Si prefieres un repo público nuevo llamado `evimes-web`** (para que la web quede en `/evimes-web/`):
  1. renombra o borra antes el privado actual en GitHub;
  2. crea el nuevo repo VACÍO;
  3. haz `git remote set-url publico https://github.com/patosarmientooscar/evimes-web.git`;
  4. ejecuta `sh tools/publicar.sh "Evimes"`;
  5. activa Pages: Settings → Pages → rama `main`, carpeta `/`.

  Nunca hagas `git push` de la rama `main` a un repo público: subiría la historia antigua.
- Las rutas internas son todas relativas, así que la web funciona igual en `/evimes-web/`, en `/evimes-web-2026/` o en el dominio propio.

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
- **Commit y push:** commit "oficina automática + listo para GitHub Pages" y `git push origin HEAD --tags` al repo privado `evimes-web`.

---

El informe de la tanda anterior (páginas propias, oficina de lejos, la primera publicación en GitHub Pages) está en la historia de git, tag `v-publicado`.
