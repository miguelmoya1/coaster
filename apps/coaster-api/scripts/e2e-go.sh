#!/usr/bin/env bash
# Lanza contra el servidor Go los e2e de apps/api que aparecen en apps/coaster-api/e2e-paquetes.txt.
# Los argumentos se pasan a vitest (por ejemplo, un nombre de test con -t).
set -euo pipefail

root="$(cd "$(dirname "$0")/../../.." && pwd)"
list="$root/apps/coaster-api/e2e-paquetes.txt"

dirs=$(grep -v '^[[:space:]]*#' "$list" | sed '/^[[:space:]]*$/d' || true)

if [ -z "$dirs" ]; then
  echo "No hay directorios en $list: nada que lanzar contra Go."
  exit 0
fi

echo "e2e contra Go: $(echo $dirs)"

cd "$root/apps/api"

# shellcheck disable=SC2086
E2E_TARGET=go npx vitest run --config ./vitest.config.e2e.ts $dirs "$@"
