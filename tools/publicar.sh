#!/bin/sh
# ==========================================================================
# tools/publicar.sh — sube a GitHub Pages el estado actual de `main`.
#
# El repositorio público (remoto `publico`, evimes-web-2026) NO lleva la
# historia de este repositorio: las versiones antiguas tenían el email y el
# teléfono escritos en el código. Cada publicación es una "foto" del árbol de
# `main` encima de la anterior foto pública (rama local `publica`), con el
# email noreply de GitHub como autor.
#
# Uso (desde la carpeta del proyecto, con todo commiteado en main):
#   sh tools/publicar.sh "Mensaje del cambio"
#
# NUNCA hagas `git push publico main`: subiría la historia privada.
# ==========================================================================
set -e
MSG=${1:-"Evimes: actualización"}
NR="266553066+patosarmientooscar@users.noreply.github.com"
NOMBRE="$(git config user.name)"
if [ -n "$(git status --porcelain)" ]; then echo "Hay cambios sin commitear en main. Commitéalos antes." >&2; exit 1; fi
ARBOL=$(git rev-parse 'main^{tree}')
PADRE=$(git rev-parse --verify -q publica || true)
# Comprobación de privacidad sobre lo que se va a subir.
# Los patrones de TUS datos (email, teléfono…) van en .privado (una expresión
# regular extendida por línea). Ese archivo está en .gitignore: nunca se sube.
PAT='@gmail|@hotmail'
if [ -f .privado ]; then PAT="$PAT|$(grep -v '^#' .privado | grep -v '^$' | paste -sd'|' -)"; fi
if git grep -I -q -E "$PAT" main -- . ':(exclude)tools/publicar.sh'; then
  echo "Hay datos privados en main (email o teléfono). No se publica." >&2
  git grep -I -n -E "$PAT" main -- . ':(exclude)tools/publicar.sh' >&2
  exit 1
fi
if [ -n "$PADRE" ] && [ "$(git rev-parse "$PADRE^{tree}")" = "$ARBOL" ]; then echo "Nada nuevo que publicar."; exit 0; fi
export GIT_AUTHOR_NAME="$NOMBRE" GIT_COMMITTER_NAME="$NOMBRE" GIT_AUTHOR_EMAIL="$NR" GIT_COMMITTER_EMAIL="$NR"
if [ -n "$PADRE" ]; then C=$(git commit-tree "$ARBOL" -p "$PADRE" -m "$MSG"); else C=$(git commit-tree "$ARBOL" -m "$MSG"); fi
git branch -f publica "$C"
git push publico publica:main
echo "Publicado: $C. GitHub Pages tarda 1-2 minutos en actualizarse."
