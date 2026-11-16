# Decisiones (modo autónomo, 16-11-2026)

Lo que decidí sin poder preguntar, y por qué. Lo que Oscar tiene que revisar está en INFORME.md.

## Bloque 0 · Punto de partida
- El prompt anterior (oficina 4K + Con quién + "altura" en cian) ya estaba terminado y con su tag (`v-oficina-3`). Solo se ha añadido el tag `v-pre-autonomo`.
- Tags: cada bloque termina con un commit y el tag que lleva su nombre; el tag de antes de cada bloque es el del bloque anterior (el primero, `v-pre-autonomo`).

## Bloque 1 · Tubos más calmados (`v-tubos-calma`)
- Valores aplicados tal cual. El suavizado del scroll del hero en el código era 0.08 (no 0.09): pasa a 0.035 igualmente.
- "Recorrido un 40 % menor" = los cinco coeficientes del hero (subir, inclinar, girar) × 0.6 y la aceleración de la luz con el scroll (1.6 → 0.96).
- "Amplitud a la mitad" = los cuatro coeficientes del ratón × 0.5.
- Deriva automática: la única es el balanceo en Z de cada banda; su frecuencia pasa de 0.35 a 0.175 (la amplitud no cambia).
- Comprobado con una réplica de la simulación en Node: con los valores nuevos el empuje se nota en las 7 bandas a la vez (0.15–0.20 en todas), deja de verse a ~1 s y el campo se apaga del todo a 1,55 s. Antes: 1,8 s visible y 2,8 s hasta apagarse.

## Bloque 2 · Scramble (`v-scramble`)
- `js/ui/scramble.js` sale de la base del prompt con tres cambios: (1) el ancho del texto se FIJA (no solo min-width) mientras dura y se suelta al terminar, porque las mayúsculas aleatorias son más anchas que el texto y el botón crecía; (2) se puede llamar varias veces (solo engancha los elementos nuevos; `EV.scramble` para lo que se pinta después: planes, Con quién, formulario); (3) lee el texto al empezar, así funciona si el texto del botón cambia ("Enviar" → "Enviando…").
- Usa requestAnimationFrame (como la base del prompt), no gsap.ticker: es un efecto de 0,6 s que solo corre al pasar el ratón; en las páginas de texto no se carga GSAP.
- `data-c` / `data-of` pasan al `<span class="sl">`: si no, los textos de content.js / oficina.js borraban el span al rellenar.
- Las flechas "→" quedan fuera del `.sl` (también la de "Ver qué incluye cada plan", que estaba dentro del texto de content.js).
- "Ver más →" del bento: aria-label "Ver más sobre <oficio>" (cuatro enlaces iguales no dicen adónde van).
- Páginas de texto y legales: el botón "Pide tu propuesta" tenía un relleno que barría el texto al pasar el ratón; se quita y queda el scramble, que es el efecto común. "Volver al inicio" también lo lleva. No se ha tocado ni una palabra del texto legal.
- Aplicado a: menú (4 enlaces), "Pide tu propuesta" de cabecera y hero, "Ver proyectos", los 4 "Ver más", "Ver la web" de la oficina, los CTA de Con quién, los botones de los planes, "Ver qué incluye cada plan". No al interruptor de Con quién ni a los campos del formulario.
