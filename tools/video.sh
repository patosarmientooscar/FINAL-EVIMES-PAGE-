#!/bin/sh
# ==========================================================================
# tools/video.sh — comprime un vídeo de recorrido por una web para las cards.
#   sh tools/video.sh entrada.mov assets/proyectos/disco-recorrido
# Saca: <salida>.mp4 (H.264, 1280 px, CRF 26, veryfast, sin audio),
#       <salida>.webm (VP9, sin audio) y <salida>.jpg (póster, primer fotograma).
# Después, en js/oficina/config.js → PROJECT.video y en js/data/proyectos.js.
# ==========================================================================
set -e
IN="$1"; OUT="$2"
[ -n "$IN" ] && [ -n "$OUT" ] || { echo "Uso: sh tools/video.sh entrada.mp4 assets/proyectos/nombre-recorrido" >&2; exit 1; }
ffmpeg -y -i "$IN" -vf "scale=1280:-2" -c:v libx264 -crf 26 -preset veryfast -pix_fmt yuv420p -an -movflags +faststart "$OUT.mp4"
ffmpeg -y -i "$IN" -vf "scale=1280:-2" -c:v libvpx-vp9 -crf 36 -b:v 0 -row-mt 1 -an "$OUT.webm"
ffmpeg -y -i "$IN" -vf "scale=1280:-2" -frames:v 1 -q:v 3 "$OUT.jpg"
ls -la "$OUT".mp4 "$OUT".webm "$OUT".jpg
