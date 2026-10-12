#!/usr/bin/env bash
# Lanza la API en Go en el anfitrión, en http://localhost:3000, con apps/api/.env. Necesita
# Postgres con las migraciones aplicadas (docker compose up db redis migrate) y el puerto libre: el
# contenedor api usa el mismo (docker compose stop api).
set -euo pipefail

here="$(cd "$(dirname "$0")/.." && pwd)"

if [ ! -f "$here/.env" ]; then
  echo "No existe apps/api/.env: cópialo de apps/api/.env_example y rellénalo." >&2
  exit 1
fi

set -a
# shellcheck disable=SC1091
. "$here/.env"
set +a

cd "$here"
exec go run ./cmd/api
