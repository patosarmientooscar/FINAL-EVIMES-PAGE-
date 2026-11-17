# Informe del modo autónomo (17-11-2026)

Todos los bloques están hechos. No se ha revertido ninguno. Las decisiones tomadas sin preguntarte (qué y por qué) están en `DECISIONES.md`, bloque a bloque.

## Lo que tienes que hacer tú

1. **`js/config.js`**: rellenar `WEB3FORMS_KEY` (el formulario no envía nada hasta entonces; enseña "Formulario en configuración"), `whatsapp`, `email`, `telefono` y `telefonoHref`. Los pasos para sacar la clave de Web3Forms están en DECISIONES.md, bloque 3. Mientras estén vacíos, los enlaces directos de contacto no salen.
2. **PageSpeed de Disco** (`js/data/pagespeed.js`: 99 / 100 / 100 / 100, Agentic 2/2, fecha 16-11-2026): confirmar que son de **discoproduccion.com**. Salen de tu captura.
3. **Textos BORRADOR**, para revisar y confirmar:
   - servicios: `js/data/servicios-pagina.js`;
   - planes: `js/data/planes-pagina.js`;
   - preguntas frecuentes: `js/data/faq-planes.js` (4 respuestas prudentes marcadas `confirmar: true`);
   - oficina: `js/data/oficina.js`;
   - con quién: `js/data/clientes.js`;
   - bento: `js/data/servicios.js`.
4. Una cosa que ver tú: el email `evimes@evimesweb.com` y el teléfono siguen en los textos legales (no se tocan) y en `oficina.html` (la oficina aparcada, noindex), que ya los llevaba de antes. En el resto del código no hay emails, teléfonos ni claves.

## Bloques y tags

| Bloque | Tag | Qué se hizo |
|---|---|---|
| 0 | `v-pre-autonomo` | Punto de partida antes de empezar. |
| 1 · Tubos | `v-tubos-calma` | Bandas más lentas, pesadas y tranquilas: la luz va a la mitad de velocidad, el ratón y el hero las mueven menos y vuelven a reposo en ~1,5 s (`SIM` en `js/fondo/onda.js`). |
| 2 · Scramble | `v-scramble` | `js/ui/scramble.js`: efecto scramble de 600 ms en todos los botones y el menú (`data-scramble`). El ancho del botón no se mueve, el texto se restaura y no hay efecto con movimiento reducido. |
| 3 · Formulario | `v-form` | Contacto con formulario a Web3Forms: validación en línea, mensajes de error, "Enviando…", "Recibido", antispam (honeypot), plan preseleccionado desde planes (`?plan=`) y "Soy…" desde Con quién. Con la clave vacía no envía y lo dice. |
| 4 · Oficina | `v-oficina-psi` | La oficina corta sin túnel, portada de `Downloads/evimes-oficina/index.html`: la ventana se abre, EVIMES se enciende, la cámara va al monitor, la web de Disco sube como card, hace scroll sola y enseña sus 4 indicadores de PageSpeed. La versión fija se ha rehecho. |
| 5 · Servicios | `v-servicios` | `servicios.html` nueva sobre el fondo global, con los 4 oficios (anclas #web #3d #seo #ia) con su card 3D, "Cómo trabajamos" y CTA. |
| 6 · Planes | `v-planes` | `planes.html` nueva: las 3 cards de cristal, tabla comparativa (acordeón en móvil), "Qué pasa después", preguntas frecuentes y CTA. |
| 7 · QA | `v-autonomo-final` | Menú común en todas las páginas con la actual marcada; "Ver más" a servicios.html#…; fondo común; QA completa; correcciones de Lighthouse y contraste. |
| 8 · GitHub | — | `.gitignore`, revisión de datos privados, commit final y repositorio privado. |

## Lo que falló o se cambió por el camino

Nada se ha revertido. Lo que salió mal y se arregló:

- **Servicios (Lighthouse móvil):** daba TBT 920 ms porque creaba las 4 cards 3D a la vez. Ahora cada card se crea al acercarse.
- **Planes:**
  - Lighthouse marcaba los botones "Empezar" como enlaces sin texto descriptivo. Ahora llevan texto oculto con el nombre del plan.
  - Los ✓ de la tabla tenían un aria-label no válido.
- **Home, frase "Si no eres visible, no existes.":** las palabras apagadas estaban a .16 de opacidad y no cumplían AA. Ahora están a .45: se sigue viendo cómo se encienden.
- **Lo que el detector de impeccable sigue marcando, a propósito:**
  - la etiqueta "Servicios"/"Planes" encima del H1, porque la pidió el prompt;
  - "Qué hacemos" y "Trabajo selecto", que vienen de los prototipos aprobados;
  - el cromo con degradado de los nombres de herramientas y la cinta que se mueve, ambos de la home aprobada;
  - el brillo cian de los indicadores de PageSpeed, que viene del prototipo de la oficina.

## QA (Playwright, Edge)

- 3 páginas a 1440×900, 1920×1080 y 390×844, sección a sección.
- La oficina en 0.1, 0.4, 0.6 y 0.95, a los 3 tamaños.
- El formulario en todos sus estados a los 3 tamaños: vacío, errores (el foco va al primero), sin clave, enviando, error, enviado y plan desde la URL. La petición a Web3Forms se simuló siempre: no ha salido nada.
- **Errores en consola: 0** en las 3 páginas. El único "500" es el error simulado del formulario.
- **fps en escritorio:**

  | Página | 1440×900 | 1920×1080 |
  |---|---|---|
  | index | 60 (p95 16,8 ms) | 60 (p95 16,8 ms) |
  | servicios | 60 (p95 16,8 ms) | 60 (p95 16,8 ms) |
  | planes | 60 (p95 16,9 ms) | 60 (p95 16,8 ms) |

- **Enlaces internos:** 144 en 12 páginas, todos bien (archivo y ancla).

Capturas (en `.playwright-mcp/`, que está en `.gitignore`: no van al repositorio):

- QA final:
  - `.playwright-mcp/autonomo/final/index|servicios|planes/<ancho>-<nn>-<sección>.png`;
  - `.playwright-mcp/autonomo/final/oficina/<ancho>-<progreso>.png`;
  - `.playwright-mcp/autonomo/final/form/<ancho>-form-<estado>.png`;
  - hojas de contacto en `.playwright-mcp/autonomo/final/hojas/`.
- Por bloque:
  - tubos: `.playwright-mcp/autonomo/tubos/`;
  - formulario: `.playwright-mcp/autonomo/form/`;
  - oficina: `psi1/` y `psi-rm/` (movimiento reducido);
  - servicios: `serv1/` y `serv2/`;
  - planes: `plan1/` y `plan2/`.

## Lighthouse 13.6.0

Lighthouse 13.6.0, Edge headless, servidor local (`tools/serve.js`). Las cifras van tal cual salieron, sin redondear. En producción (con CDN, compresión y caché) pueden cambiar, y en móvil varían bastante de una pasada a otra. Los JSON están en `.playwright-mcp/autonomo/lh/`.

Las columnas son Rendimiento (Rend.), Accesibilidad (Acces.), Prácticas recomendadas (Práct.), SEO y Agentic browsing (Agentic).

**Primera pasada (antes de las correcciones del bloque 7)**

| Página | Rend. | Acces. | Práct. | SEO | Agentic | LCP | TBT | CLS |
|---|---|---|---|---|---|---|---|---|
| index · móvil | 89 | 96 | 100 | 100 | 100 | 2,0 s | 370 ms | 0 |
| index · escritorio | 100 | 96 | 100 | 100 | 100 | 0,5 s | 80 ms | 0 |
| servicios · móvil | 79 | 100 | 100 | 100 | 100 | 1,5 s | 920 ms | 0 |
| servicios · escritorio | 99 | 100 | 100 | 100 | 100 | 0,4 s | 110 ms | 0 |
| planes · móvil | 100 | 95 | 100 | 91 | 50 | 1,4 s | 0 ms | 0 |
| planes · escritorio | 100 | 95 | 100 | 91 | 50 | 0,4 s | 0 ms | 0 |

**Después de las correcciones**

| Página | Rend. | Acces. | Práct. | SEO | Agentic | LCP | TBT | CLS |
|---|---|---|---|---|---|---|---|---|
| servicios · móvil | 84 | 100 | 100 | 100 | 100 | 1,5 s | 600 ms | 0 |
| planes · móvil | 100 | 100 | 100 | 100 | 100 | 1,4 s | 20 ms | 0 |
| index · móvil (2.ª pasada, frase a .4) | 77 | 96 | 100 | 100 | 100 | 2,0 s | 930 ms | 0 |
| index · móvil (3.ª pasada, frase a .45) | 88 | 100 | 100 | 100 | 100 | 1,9 s | 410 ms | 0 |
| index · escritorio | 100 | 100 | 100 | 100 | 100 | 0,4 s | 0 ms | 0 |
| planes · escritorio | 100 | 100 | 100 | 100 | 100 | 0,6 s | 50 ms | 0 |

Notas:

- **index móvil:** entre la 1.ª y la 2.ª pasada solo cambió una opacidad en CSS, y el TBT pasó de 370 a 930 ms. Es una sola tarea larga "sin atribuir" del navegador, a los ~2 s: la variación es de la máquina, no del cambio.
- **index, accesibilidad:** el 96 de la 2.ª pasada era por el cian apagado de la frase (2,8:1 con .4). Con .45 sube a 100.
- **servicios móvil:** sigue en TBT 600 ms. Es lo que cuesta arrancar la primera card WebGL. Se puede bajar más con un póster hasta el primer gesto, como hace la home con la onda; queda propuesto, no hecho.

## Repositorio

https://github.com/patosarmientooscar/evimes-web (creado con `gh repo create evimes-web --private --source=. --remote=origin --push` y `git push --tags`).

Privado. Sin GitHub Pages ni ningún despliegue.
