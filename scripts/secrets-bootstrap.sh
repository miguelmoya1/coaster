#!/usr/bin/env bash
#
# Move the API's credentials into Secret Manager, one set per environment.
#
#   scripts/secrets-bootstrap.sh beta ~/coaster-beta.secrets.env
#   scripts/secrets-bootstrap.sh prod ~/coaster-prod.secrets.env
#
# The file is KEY=value, one per line, holding the variables listed in REQUIRED and
# OPTIONAL below and nothing else. Keep it outside the repository and delete it when
# you are done: it is the only place the values sit in the clear.
#
# Safe to re-run. A secret that already exists is left exactly as it is — this script
# never overwrites a value, so it cannot quietly undo a rotation. Rotating is its own
# deliberate command; see docs/operations/secrets.md.
#
# Run it before merging the workflow that reads these secrets. CI refuses to deploy an
# environment whose required secrets are missing, so the wrong order costs a red run,
# not an outage.

set -euo pipefail

PROJECT='coaster-437f2'
REGION_SERVICE='europe-west1'
REGION_JOB='europe-southwest1'

# The same two lists live in .github/workflows/ci.yml. Required means the API cannot
# serve without it; optional means beta is allowed to run without a cache or without
# the assistant, and CI wires whichever of them exists.
REQUIRED='DATABASE_URL AUTH_JWT_SECRET PRINTER_JWT_SECRET STRIPE_SECRET_KEY STRIPE_WEBHOOK_SECRET RESEND_API_KEY'
OPTIONAL='AI_GATEWAY_API_KEY REDIS_URL'

usage() {
  sed -n '3,6p' "$0" | sed 's/^# \{0,1\}//'
  echo
  echo "environments: prod (api-new) · beta (api-beta)"
}

case "${1:-}" in
  prod) PREFIX='coaster-prod'; SERVICE='api-new';  JOB='api-migrate' ;;
  beta) PREFIX='coaster-beta'; SERVICE='api-beta'; JOB='api-migrate-beta' ;;
  *) usage >&2; exit 64 ;;
esac

VALUES="${2:-}"

if [ -z "$VALUES" ] || [ ! -r "$VALUES" ]; then
  echo "error: give me a readable KEY=value file as the second argument" >&2
  usage >&2
  exit 64
fi

command -v gcloud >/dev/null || { echo 'error: gcloud is not on PATH' >&2; exit 69; }

# The file is KEY=value and the values carry = and : — a connection string is full of
# both — so only the first = separates. One wrapping pair of quotes is stripped because
# the documented file format shows them; nothing else about the value is touched.
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

secret_name() {
  printf '%s-%s' "$PREFIX" "$(printf '%s' "$1" | tr 'A-Z_' 'a-z-')"
}

echo "▸ project ${PROJECT} · service ${SERVICE} · job ${JOB} · prefix ${PREFIX}"

gcloud services enable secretmanager.googleapis.com --project "$PROJECT" >/dev/null

# Whoever the service runs as is who has to read the secrets. An empty answer means it
# runs as the project's default compute account, which is what a service deployed
# without --service-account gets.
SERVICE_SA=$(gcloud run services describe "$SERVICE" --project "$PROJECT" \
  --region "$REGION_SERVICE" --format='value(spec.template.spec.serviceAccountName)')

if [ -z "$SERVICE_SA" ]; then
  SERVICE_SA="$(gcloud projects describe "$PROJECT" --format='value(projectNumber)')-compute@developer.gserviceaccount.com"
  echo "▸ ${SERVICE} carries no service account; it runs as ${SERVICE_SA}"
fi

# On a brand new environment the migration job does not exist yet, and an existing job
# that carries no account of its own answers the same empty string as a describe that
# failed — hence the exit status rather than the output.
if JOB_SA=$(gcloud run jobs describe "$JOB" --project "$PROJECT" --region "$REGION_JOB" \
     --format='value(spec.template.spec.template.spec.serviceAccountName)' 2>/dev/null); then
  JOB_EXISTS=1
  [ -n "$JOB_SA" ] || JOB_SA="$SERVICE_SA"
else
  JOB_EXISTS=0
  JOB_SA="$SERVICE_SA"
  echo "▸ ${JOB} does not exist yet; create it, then run this again to attach its secret"
fi

READERS="$SERVICE_SA"
[ "$JOB_SA" = "$SERVICE_SA" ] || READERS="$SERVICE_SA $JOB_SA"

echo "▸ readers: ${READERS}"
echo

mapping=''
missing=''

for name in $REQUIRED $OPTIONAL; do
  secret=$(secret_name "$name")

  if value=$(value_of "$name"); then
    if gcloud secrets describe "$secret" --project "$PROJECT" >/dev/null 2>&1; then
      echo "= ${secret} already exists, value untouched"
    else
      # Pinned to europe-west1 rather than replicated everywhere: the data is a European
      # customer's database password, and a secret is readable from any region regardless
      # of where it is stored, so the job in europe-southwest1 still gets it.
      gcloud secrets create "$secret" --project "$PROJECT" \
        --replication-policy=user-managed --locations="$REGION_SERVICE" \
        --labels="app=coaster,env=${PREFIX#coaster-}" >/dev/null

      # printf, not echo: a trailing newline inside DATABASE_URL is a connection string
      # that no longer parses, and it would be invisible everywhere you looked.
      printf '%s' "$value" | gcloud secrets versions add "$secret" --project "$PROJECT" --data-file=- >/dev/null

      echo "+ ${secret} created"
    fi

    for reader in $READERS; do
      gcloud secrets add-iam-policy-binding "$secret" --project "$PROJECT" \
        --member="serviceAccount:${reader}" --role='roles/secretmanager.secretAccessor' >/dev/null
    done

    mapping="${mapping:+$mapping,}${name}=${secret}:latest"
    continue
  fi

  case " $REQUIRED " in
    *" $name "*) missing="${missing} ${name}" ;;
    *) echo "- ${name} is not in the file; ${SERVICE} runs without it, and any literal copy it still carries is removed below" ;;
  esac
done

if [ -n "$missing" ]; then
  echo >&2
  echo "error: no value in ${VALUES} for:${missing}" >&2
  echo "The API cannot serve without these, so nothing was attached to ${SERVICE} and it is still" >&2
  echo "running on the environment variables it had. Whatever secrets got created above are kept;" >&2
  echo "fill the file in and run this again, which will skip them and carry on." >&2
  exit 78
fi

echo
echo "▸ attaching to ${SERVICE}"

# One command, not two. The literal copies have to go — left behind, they sit in the
# service YAML in the clear and Cloud Run refuses a name that is both a literal and a
# secret — but a revision that drops them before the secrets land is a revision with no
# database, and this way no such revision is ever created.
gcloud run services update "$SERVICE" --project "$PROJECT" --region "$REGION_SERVICE" \
  --remove-env-vars="$(printf '%s' "$REQUIRED $OPTIONAL" | tr ' ' ',')" \
  --update-secrets="$mapping"

if [ "$JOB_EXISTS" = 1 ]; then
  echo "▸ attaching to ${JOB}"

  gcloud run jobs update "$JOB" --project "$PROJECT" --region "$REGION_JOB" \
    --remove-env-vars='DATABASE_URL' \
    --update-secrets="DATABASE_URL=$(secret_name DATABASE_URL):latest"

  echo
  echo "Done. ${SERVICE} and ${JOB} now read their credentials from Secret Manager."
else
  echo
  echo "Done for ${SERVICE}. ${JOB} does not exist yet, so run this again once it does —"
  echo "the migration step of every deploy reads its database URL from the same secret."
fi

cat <<DONE

Three things left, in this order:

  1. Set the prefix on the GitHub environment, or the next deploy fails the check step:
       gh variable set GCP_SECRET_PREFIX --env $([ "$PREFIX" = 'coaster-prod' ] && echo api-production || echo api-beta) --body ${PREFIX}

  2. Confirm the service came back up, then delete the GitHub secret that CI no longer reads:
       curl -s https://$([ "$PREFIX" = 'coaster-prod' ] && echo api.coaster.business || echo api.beta.coaster.business)/api/v1/ping
       gh secret delete DATABASE_URL --env $([ "$PREFIX" = 'coaster-prod' ] && echo api-production || echo api-beta)

  3. Delete ${VALUES}.
DONE
