#!/usr/bin/env bash
#
# Put this environment's credentials into Secret Manager, taking them from the values
# the Cloud Run service is already running on.
#
#   scripts/secrets-bootstrap.sh beta
#   scripts/secrets-bootstrap.sh prod
#
# It creates secrets and lets the service account read them. It does not touch the
# service, so running it changes nothing that is serving traffic: the switch happens on
# the next deploy, and undoing it is rolling back a revision like any other.
#
# Safe to re-run. A secret that already exists is left exactly as it is, so this can
# never undo a rotation.
#
# A second argument, a KEY=value file, fills in whatever the service does not already
# carry — a credential you are introducing, or an environment built from nothing. What
# is in the file wins over what is on the service.

set -euo pipefail

PROJECT='coaster-437f2'
REGION='europe-west1'
REGION_JOB='europe-southwest1'

# The same two lists live in .github/workflows/ci.yml. Required means the API cannot
# serve without it; optional means beta is allowed to run without a cache and without
# the assistant, and the deploy wires whichever of them exists.
REQUIRED='DATABASE_URL AUTH_JWT_SECRET PRINTER_JWT_SECRET STRIPE_SECRET_KEY STRIPE_WEBHOOK_SECRET RESEND_API_KEY'
OPTIONAL='AI_GATEWAY_API_KEY REDIS_URL'

case "${1:-}" in
  prod) PREFIX='coaster-prod'; SERVICE='api-new';  JOB='api-migrate' ;;
  beta) PREFIX='coaster-beta'; SERVICE='api-beta'; JOB='api-migrate-beta' ;;
  *) sed -n '3,7p' "$0" | sed 's/^# \{0,1\}//' >&2; exit 64 ;;
esac

OVERRIDES="${2:-}"

if [ -n "$OVERRIDES" ] && [ ! -r "$OVERRIDES" ]; then
  echo "error: cannot read ${OVERRIDES}" >&2
  exit 64
fi

for tool in gcloud jq; do
  command -v "$tool" >/dev/null || { echo "error: ${tool} is not on PATH" >&2; exit 69; }
done

echo "▸ ${SERVICE} → ${PREFIX}-*"

gcloud services enable secretmanager.googleapis.com --project "$PROJECT" >/dev/null

if ! SERVICE_JSON=$(gcloud run services describe "$SERVICE" --project "$PROJECT" \
     --region "$REGION" --format=json 2>/dev/null); then
  echo "error: ${SERVICE} does not exist in ${REGION}." >&2
  echo "Create it first — docs/operations/environments.md walks through a new environment." >&2
  exit 78
fi

# One file to look values up in. The overrides go first because value_of takes the first
# match, so a value you pass beats the one the service is running on.
VALUES=$(mktemp)
trap 'rm -f "$VALUES"' EXIT

[ -n "$OVERRIDES" ] && cat "$OVERRIDES" >> "$VALUES"

printf '%s' "$SERVICE_JSON" \
  | jq -r '.spec.template.spec.containers[0].env[]? | select(.value != null) | "\(.name)=\(.value)"' \
  >> "$VALUES"

# Values carry = and : — a connection string is full of both — so only the first =
# separates. One wrapping pair of quotes is stripped because a hand-written file tends
# to have them; nothing else about the value is touched.
value_of() {
  local key="$1" line value
  line=$(grep -m1 "^${key}=" "$VALUES" || true)
  [ -n "$line" ] || return 1
  value=${line#*=}
  value=${value%$'\r'}
  case "$value" in
    \"*\") value=${value#\"}; value=${value%\"} ;;
    \'*\') value=${value#\'}; value=${value%\'} ;;
  esac
  [ -n "$value" ] || return 1
  printf '%s' "$value"
}

# Whoever the service runs as is who has to read the secrets. No account of its own
# means it runs as the project's default compute account.
SERVICE_SA=$(printf '%s' "$SERVICE_JSON" | jq -r '.spec.template.spec.serviceAccountName // empty')

if [ -z "$SERVICE_SA" ]; then
  SERVICE_SA="$(gcloud projects describe "$PROJECT" --format='value(projectNumber)')-compute@developer.gserviceaccount.com"
fi

# The migration job reads DATABASE_URL too, and it is a separate resource that can run as
# a separate account. Granting only the service's would leave every deploy failing at the
# migration step with a permission error about a secret that looks perfectly fine.
JOB_SA=$(gcloud run jobs describe "$JOB" --project "$PROJECT" --region "$REGION_JOB" \
  --format='value(spec.template.spec.template.spec.serviceAccountName)' 2>/dev/null || true)

READERS="$SERVICE_SA"
[ -z "$JOB_SA" ] || [ "$JOB_SA" = "$SERVICE_SA" ] || READERS="$SERVICE_SA $JOB_SA"

echo "▸ readers: ${READERS}"
echo

missing=''

for name in $REQUIRED $OPTIONAL; do
  secret="${PREFIX}-$(printf '%s' "$name" | tr 'A-Z_' 'a-z-')"

  if ! value=$(value_of "$name"); then
    case " $REQUIRED " in
      *" $name "*) missing="${missing} ${name}" ;;
      *) echo "- ${name} is set nowhere; ${SERVICE} keeps running without it" ;;
    esac
    continue
  fi

  if gcloud secrets describe "$secret" --project "$PROJECT" >/dev/null 2>&1; then
    echo "= ${secret}"
  else
    # Pinned to europe-west1 rather than replicated everywhere: it is a European
    # customer's database password. A secret is readable from any region regardless of
    # where it is stored, so the migration job in europe-southwest1 still gets it.
    gcloud secrets create "$secret" --project "$PROJECT" \
      --replication-policy=user-managed --locations="$REGION" \
      --labels="app=coaster,env=${PREFIX#coaster-}" >/dev/null

    # printf, not echo: a trailing newline inside DATABASE_URL is a connection string
    # that no longer parses, and it would be invisible everywhere you looked.
    printf '%s' "$value" | gcloud secrets versions add "$secret" --project "$PROJECT" --data-file=- >/dev/null

    echo "+ ${secret}"
  fi

  for reader in $READERS; do
    gcloud secrets add-iam-policy-binding "$secret" --project "$PROJECT" \
      --member="serviceAccount:${reader}" --role='roles/secretmanager.secretAccessor' >/dev/null
  done
done

if [ -n "$missing" ]; then
  echo >&2
  echo "error: no value anywhere for:${missing}" >&2
  echo "${SERVICE} is not running on them either, so pass them in a KEY=value file:" >&2
  echo "  $0 ${1} ./my-values.env" >&2
  exit 78
fi

echo
echo "Done. ${SERVICE} is untouched and still serving; the next deploy is what switches it over."
