#!/usr/bin/env bash
# Crea apps/coaster-api/.env para lanzar la API en Go en el anfitrión (scripts/dev.sh), con las
# variables que Go lee sacadas del .env de Nest (apps/api/.env, y el de la raíz si existe) y
# lo que cambia para Go: puerto 3000, public de apps/api y NODE_ENV=development.
# Si apps/coaster-api/.env ya existe, lo vuelve a escribir.
set -euo pipefail

here="$(cd "$(dirname "$0")/.." && pwd)"
root="$(cd "$here/../.." && pwd)"
target="$here/.env"

# Las que lee internal/config/config.go, salvo las que solo son para tests.
keys=(
  DATABASE_URL REDIS_URL
  AUTH_JWT_SECRET PRINTER_JWT_SECRET GOOGLE_CLIENT_ID
  BETA_ALLOWLIST_ENABLED PWNED_PASSWORDS_ENABLED
  FRONTEND_URL CORS_ORIGINS TRUST_PROXY_HOPS
  STRIPE_SECRET_KEY STRIPE_WEBHOOK_SECRET STRIPE_PRICE_PRO STRIPE_PRICE_PRO_LEGACY
  PRO_BASE_PRICE_CENTS PRO_INCLUDED_SEATS PRO_EXTRA_SEAT_PRICE_CENTS
  RESEND_API_KEY EMAIL_FROM MEDIA_BUCKET
  AI_GATEWAY_API_KEY AI_MONTHLY_MESSAGES AI_TRIAL_MONTHLY_MESSAGES
)

if [ ! -f "$root/apps/api/.env" ]; then
  echo "No existe apps/api/.env: créalo a partir de apps/api/.env_example (o apps/coaster-api/.env_example) y vuelve a lanzar esto." >&2
  exit 1
fi

# Se leen en un subshell para no mezclarlas con el entorno de quien lanza el script. El de
# apps/api va después, así que gana al de la raíz, como en Nest.
values="$(
  set -a
  # shellcheck disable=SC1091
  [ -f "$root/.env" ] && . "$root/.env"
  # shellcheck disable=SC1091
  . "$root/apps/api/.env"
  set +a
  for key in "${keys[@]}"; do
    printf '%s\t%s\n' "$key" "${!key:-}"
  done
)"

quote() {
  printf "'%s'" "${1//\'/\'\\\'\'}"
}

missing=()
{
  echo "# Generado por apps/coaster-api/scripts/env-local.sh a partir de apps/api/.env."
  echo "# Para lanzar Go en el anfitrión: apps/coaster-api/scripts/dev.sh"
  echo "NODE_ENV='development'"
  echo "PORT='3000'"
  echo "PUBLIC_DIR=$(quote "$root/apps/api/public")"
  echo "PUBLIC_URL='http://localhost:3000'"

  while IFS=$'\t' read -r key value; do
    if [ "$key" = "DATABASE_URL" ] && [ -z "$value" ]; then
      value="postgres://admin:admin@localhost:5432/coaster"
    fi
    if [ -z "$value" ]; then
      case "$key" in
        AUTH_JWT_SECRET | PRINTER_JWT_SECRET) missing+=("$key") ;;
      esac
      continue
    fi
    echo "$key=$(quote "$value")"
  done <<< "$values"
} > "$target"

echo "Escrito $target"

if grep -qE "^DATABASE_URL='[^']*@db:" "$target"; then
  echo "Aviso: DATABASE_URL apunta al host «db» de docker compose. Fuera de Docker es localhost:5432." >&2
fi

if [ ${#missing[@]} -gt 0 ]; then
  echo "Faltan en apps/api/.env (Go no arranca sin ellas): ${missing[*]}" >&2
  exit 1
fi
