#!/usr/bin/env bash
# Lanza contra el servidor Go los e2e de apps/api.
# Los argumentos se pasan a vitest: directorios (test/orders) o un nombre de test con -t.
set -euo pipefail

root="$(cd "$(dirname "$0")/../../.." && pwd)"

cd "$root/apps/api"

E2E_TARGET=go npx vitest run --config ./vitest.config.e2e.ts "$@"
