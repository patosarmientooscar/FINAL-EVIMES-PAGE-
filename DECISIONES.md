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
