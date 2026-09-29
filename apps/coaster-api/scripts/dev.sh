#!/usr/bin/env bash
# Lanza la API en Go en el anfitrión, en http://localhost:3000, con apps/coaster-api/.env. Necesita
# Postgres con las migraciones aplicadas (docker compose up db redis migrate) y el puerto libre: el
# contenedor coaster-api usa el mismo (docker compose stop coaster-api).
set -euo pipefail

here="$(cd "$(dirname "$0")/.." && pwd)"

if [ ! -f "$here/.env" ]; then
  echo "No existe apps/coaster-api/.env: cópialo de apps/coaster-api/.env_example y rellénalo." >&2
  exit 1
fi

set -a
# shellcheck disable=SC1091
. "$here/.env"
set +a

cd "$here"
exec go run ./cmd/api
