#!/usr/bin/env bash
# Lanza la API en Go en el anfitrión, en http://localhost:3001, con apps/api-go/.env. Si no
# existe, lo crea antes a partir de apps/api/.env (scripts/env-local.sh). Necesita Postgres
# con las migraciones aplicadas: docker compose up db redis, y las migraciones de Prisma.
set -euo pipefail

here="$(cd "$(dirname "$0")/.." && pwd)"

if [ ! -f "$here/.env" ]; then
  "$here/scripts/env-local.sh"
fi

set -a
# shellcheck disable=SC1091
. "$here/.env"
set +a

cd "$here"
exec go run ./cmd/api
