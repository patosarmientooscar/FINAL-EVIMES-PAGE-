# assets/onda

Fotogramas fijos de "la onda de cromo" para la versión fija (movimiento reducido,
sin WebGL, ahorro de datos) y la imagen OG. Salen del propio render
(`index.html?onda=captura&modo=cine` → `window.__ondaCaptura()`): las bandas sin luces, CON
transparencia (debajo se ven el negro y las líneas de css/fondo.css). La OG es la misma
captura sobre #0b0c0f con las líneas, opaca.

- `onda-escritorio.png/.webp/.avif` — 1920×1080, dpr 1.
- `onda-movil.png/.webp/.avif` — 390×844 a dpr 2 (780×1688).
- El AVIF (con alfa) es el que se precarga en la home; el WebP queda de respaldo. Se saca del PNG:
  (el alfa va como segunda pista; con `-pix_fmt yuva444p` se pierde y los extremos de las bandas salen cortados)
  `ffmpeg -i onda-escritorio.png -filter_complex "[0:v]split[x][y];[x]format=yuv444p[c];[y]alphaextract,format=gray,setparams=colorspace=bt709:range=pc[a]" -map "[c]" -map "[a]" -c:v libaom-av1 -still-picture 1 -crf 22 -cpu-used 4 onda-escritorio.avif`
- `onda-og.jpg` — 1200×630 (og:image / twitter:image).

Si cambian la forma, la posición o el material de las bandas (js/fondo/onda.js)
hay que volver a sacarlos. (Los rayos ya no existen: v-pre-negro.)
- `grano.png` — tesela de ruido 200×200 (ffmpeg, geq random) para el grano de película.
