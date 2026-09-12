# Production and beta

Two environments run the same code from two branches. `main` is production, `dev` is beta. They
share one GCP project and one Artifact Registry image; everything else is
duplicated, and the things that **must** be duplicated are listed below with the reason.

|                    | Production                          | Beta                                             |
| ------------------ | ----------------------------------- | ------------------------------------------------ |
| Branch             | `main`                              | `dev`                                            |
| Web                | `www.coaster.business` (Vercel)     | `beta.coaster.business` (its own Vercel project) |
| API                | `api.coaster.business`              | `api.beta.coaster.business`                      |
| Cloud Run service  | `api-new` · `europe-west1`          | `api-beta` · `europe-west1`                      |
| Migration job      | `api-migrate` · `europe-southwest1` | `api-migrate-beta` · `europe-southwest1`         |
| Database           | its own Neon project                | its own Neon project                             |
| Stripe             | live keys                           | test keys                                        |
| GitHub environment | `api-production`                    | `api-beta`                                       |
| Search engines     | indexed                             | `ALLOW_INDEXING=false`                           |

## One workflow, two environments

`deploy-backend` in [ci.yml](../../.github/workflows/ci.yml) runs on every push to `main` and to
`dev`, and the branch chooses the GitHub environment:

```yaml
environment: ${{ github.ref_name == 'main' && 'api-production' || 'api-beta' }}
```

From there the job body never mentions an environment again: the service name, the job name, the
secret prefix and `PUBLIC_URL` come from `vars`, and each resolves to whatever that environment
holds. A deploy to beta and a deploy to production are the same twelve lines.

The first step fails the run if any of the four is empty, and the step that resolves the secret
mapping fails it if a required credential is missing — both before an image is built. A GitHub
environment that was never configured cannot half-deploy anything.

**What lives where:**

| Value                                                                                                                                                      | Where it is set                             | Why there                                                                             |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------- | ------------------------------------------------------------------------------------- |
| `GCP_SERVICE_NAME`, `GCP_JOB_NAME`, `GCP_SECRET_PREFIX`, `PUBLIC_URL`                                                                                      | GitHub environment **variables**            | CI needs them to know what it is deploying, and which set of credentials to wire      |
| `DATABASE_URL`, `AUTH_JWT_SECRET`, `PRINTER_JWT_SECRET`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `RESEND_API_KEY`, `AI_GATEWAY_API_KEY`, `REDIS_URL` | **Secret Manager**, one set per environment | Credentials. CI passes their names and never their values — see [secrets](secrets.md) |
| `FRONTEND_URL`, `CORS_ORIGINS`, `MEDIA_BUCKET`, `STRIPE_PRICE_*`, `EMAIL_FROM`, `GOOGLE_CLIENT_ID`, `BETA_ALLOWLIST_ENABLED` …                             | The Cloud Run service                       | Runtime configuration, never needed to build or release                               |
| `PRODUCTION`, `API_URL`, `GOOGLE_CLIENT_ID`, `ALLOW_INDEXING`                                                                                              | Vercel project                              | Baked into the bundle at build time by `set-env.ts`                                   |

## What the two environments must never share

**The cache.** Cache keys carry no environment. `user:{id}` is the _same key_ in both, so one Redis
between them and a beta request can be served a production user row, whose ids belong to a database
beta has never seen. Beta gets its own
Redis, or none: with `REDIS_URL` unset it simply reads Postgres, which is what the whole application
did until recently. See [the shared cache](redis.md).

**The database.** Beta runs migrations that have not been through production yet. That is the point
of it.

**`PRINTER_JWT_SECRET`.** It signs the token a printer bridge carries. Shared, a pairing done in
beta prints on a real venue's printer.

**Stripe.** Beta uses test-mode keys, its own webhook endpoint (`https://api.beta.coaster.business/api/v1/stripe/webhook`)
and the signing secret that endpoint gives you. A beta checkout must not be able to charge a card.

**`CORS_ORIGINS`.** Each environment allows only its own web origin. Production listing beta's
origin would let a beta build drive production's API with a production token, which is the one
crossing this whole page exists to prevent.

**`EMAIL_FROM`.** The sender, `Coaster <hello@coaster.business>` unless set. It used to be a string
in the code; a domain change is now a variable, not a deploy.

**`RESEND_API_KEY`.** Invitations, confirmations and password resets from beta are real emails to
real people. A separate key keeps the
quota and the audit trail separate, and lets you revoke beta without touching production. The link
in the email follows `FRONTEND_URL`, so it lands in the environment that sent it.

**`GOOGLE_CLIENT_ID`.** The OAuth web client the browser signs against, and the `aud` the API
demands. The same one in both environments — it is not a secret, it ships in the bundle — but its
**authorized JavaScript origins** must list every origin that will use it: `https://www.coaster.business`,
`https://beta.coaster.business` and `http://localhost:4200`. No redirect URIs: the identity-token
flow does not use any. Unset, the API answers `503` and the web app hides the button, so a missing
client id is visible rather than silent — outside a production build the login page says as much
where the button would be. In local containers it travels through `compose.yaml` from the shell or a
`.env` at the repository root, which `set-env.ts` also reads — both sides must see the same value,
because the generated `environment.ts` lives in the bind-mounted repository and whoever ran
`set-env.ts` last wins.

**`AUTH_JWT_SECRET`.** It signs the access tokens. Shared, a token minted by beta would be accepted
by production for a user id that means something else there. Generate one per environment with
`node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`. Rotating it signs
everybody out, which is the point.

The refresh cookie carries **no `Domain`**, which is what keeps the two apart without a setting to
forget. It is set by the API and only ever travels back to the API, so a host-only cookie on
`api.coaster.business` is enough — and `www` reaching `api` is same-site, so `SameSite=Lax` still
sends it. Given a shared `.coaster.business` instead, beta and production would write the same
cookie name over each other and sign the same person out on every switch.

## Setting beta up from scratch

Everything below is done once. `gcloud`, `gh` and `vercel` all assume you are logged in.

### 1. GitHub environments — do this first

The workflow refuses to deploy an environment it cannot read, **including production**. Configure
both before merging to `main`.

```sh
gh api -X PUT repos/miguelmoya1/coaster/environments/api-production
gh variable set GCP_SERVICE_NAME  --env api-production --body api-new
gh variable set GCP_JOB_NAME      --env api-production --body api-migrate
gh variable set GCP_SECRET_PREFIX --env api-production --body coaster-prod
gh variable set PUBLIC_URL        --env api-production --body https://api.coaster.business

gh api -X PUT repos/miguelmoya1/coaster/environments/api-beta
gh variable set GCP_SERVICE_NAME  --env api-beta --body api-beta
gh variable set GCP_JOB_NAME      --env api-beta --body api-migrate-beta
gh variable set GCP_SECRET_PREFIX --env api-beta --body coaster-beta
gh variable set PUBLIC_URL        --env api-beta --body https://api.beta.coaster.business
```

No GitHub secrets: the database URL the migration job needs comes from Secret Manager, so this
pipeline keeps nothing worth stealing on GitHub's side. If an environment or the repository still
carries a `DATABASE_URL` secret from before that change, delete it — nothing reads it, and a
credential nobody reads is a credential nobody rotates.

Optionally pin each environment to its branch, so a run from the wrong branch cannot reach the wrong
database:

```sh
gh api -X PUT repos/miguelmoya1/coaster/environments/api-beta --input - <<'JSON'
{"deployment_branch_policy":{"protected_branches":false,"custom_branch_policies":true}}
JSON
gh api -X POST repos/miguelmoya1/coaster/environments/api-beta/deployment-branch-policies -f name=dev
```

### 2. Check the Workload Identity provider accepts `dev`

CI authenticates to GCP through a provider that may carry an attribute condition pinning the branch:

```sh
gcloud iam workload-identity-pools providers describe my-repo \
  --project=coaster-437f2 --location=global --workload-identity-pool=github \
  --format='value(attributeCondition)'
```

If the condition mentions `refs/heads/main`, widen it to the repository (or add `dev`) — otherwise
the beta deploy dies at the authentication step with a permission error that says nothing about
branches.

### 3. The database

A new Neon project — not a branch of production: beta has no business holding customer data. Copy
its pooled connection string; that is the `DATABASE_URL` for both the GitHub environment and the
Cloud Run service.

Migrations run themselves on every deploy, from the same image that is about to serve traffic.

### 4. The Cloud Run service and its migration job

Beta copies production's shape — same service account, so signed upload URLs and Cloud Storage work
without a single new IAM binding — and starts on production's current image, which the first `dev`
push replaces.

```sh
REGION=europe-west1
IMAGE=$(gcloud run services describe api-new --region $REGION --format='value(spec.template.spec.containers[0].image)')
SA=$(gcloud run services describe api-new --region $REGION --format='value(spec.template.spec.serviceAccountName)')
```

If `$SA` comes back empty, production runs as the project's default compute account: drop the
`--service-account` flag below and beta will do the same.

The configuration splits in two. The credentials go to Secret Manager, in a moment; what is left is
plain configuration, and it goes to a file because `CORS_ORIGINS` is comma-separated and commas make
`--set-env-vars` unusable:

```yaml
# /tmp/api-beta.env.yaml
FRONTEND_URL: 'https://beta.coaster.business'
PUBLIC_URL: 'https://api.beta.coaster.business'
STRIPE_PRICE_PRO: 'price_…'
CORS_ORIGINS: 'https://beta.coaster.business'
MEDIA_BUCKET: 'coaster-media-beta'
```

```sh
gcloud run deploy api-beta \
  --region $REGION \
  --image "$IMAGE" \
  --service-account "$SA" \
  --env-vars-file /tmp/api-beta.env.yaml \
  --min-instances 0 \
  --timeout 3600 \
  --allow-unauthenticated
```

`--min-instances 0` is the difference between beta costing a cold start and beta costing money all
month.

Now the eight credentials. Write beta's values to a file outside the repository and hand it to the
bootstrap script, which creates the secrets, lets `$SA` read them and attaches them to both the
service and the job — [secrets](secrets.md) has the file's shape and the reasoning:

```sh
scripts/secrets-bootstrap.sh beta ~/coaster-beta.secrets.env
```

Beta's values are its own, all eight of them, for the reasons above. `REDIS_URL` and
`AI_GATEWAY_API_KEY` may simply be absent; the other six are not optional.

Run it **after** creating the migration job below, so it can attach the database secret in the same
pass — or run it again afterwards, which is free.

The migration job carries no configuration of its own — CI overwrites its image on every run and
points it at the environment's database secret — so it only has to exist:

```sh
gcloud run jobs create api-migrate-beta \
  --region europe-southwest1 \
  --image "$IMAGE" \
  --service-account "$SA" \
  --command "npx,prisma,migrate,deploy,--config=apps/api/prisma.config.ts"
```

Create it as the same account the API runs as, which CI is already allowed to act as. Skip this and
the first beta deploy has to create the job itself, which fails unless `github-actions@` also holds
`roles/iam.serviceAccountUser` on the default compute account.

`MEDIA_BUCKET` is the one piece of the file that needs something to exist first. Beta can point at
production's bucket — uploads are namespaced by establishment id, so nothing collides — but test
images then live in it forever. Its own bucket costs three lines:

```sh
gcloud storage buckets create gs://coaster-media-beta --location=$REGION --uniform-bucket-level-access
gcloud storage buckets add-iam-policy-binding gs://coaster-media-beta --member=allUsers --role=roles/storage.objectViewer
gcloud storage buckets add-iam-policy-binding gs://coaster-media-beta --member="serviceAccount:$SA" --role=roles/storage.objectAdmin
```

The public read matters: uploaded images are served straight from `storage.googleapis.com`.

### 5. The domain

```sh
gcloud beta run domain-mappings create \
  --service api-beta --domain api.beta.coaster.business --region $REGION
```

It prints the record to create. DNS for `coaster.business` lives in Vercel:

```sh
vercel dns add coaster.business api.beta CNAME ghs.googlehosted.com
```

`coaster.business` is already verified in Search Console — the TXT record on the apex — and
verification covers every subdomain, so nothing else is needed. Google issues the certificate a few
minutes after the CNAME resolves.

### 6. The Vercel project

A **second Vercel project** on the same repository, with `dev` as its production branch. Not a
preview of the existing one: preview deployments are behind Vercel Authentication, which is why
`beta.coaster.business` currently answers with a redirect to `vercel.com/sso-api` instead of the
app. Turning that off would expose every pull-request preview too.

Copy the existing project's Root Directory, Build Command, Install Command and Node version exactly
— the monorepo installs from the root through npm workspaces, and a project configured differently
will build something subtly different. Then set, in its **Production** environment:

| Variable           | Value                               |
| ------------------ | ----------------------------------- |
| `PRODUCTION`       | `true`                              |
| `API_URL`          | `https://api.beta.coaster.business` |
| `GOOGLE_CLIENT_ID` | same as production                  |
| `ALLOW_INDEXING`   | `false`                             |
| `DEFAULT_LANGUAGE` | same as production                  |

`PRODUCTION=true` is what makes it a real build for real people rather than a development one.
`ALLOW_INDEXING=false` makes `set-env.ts` write a
`robots.txt` that disallows everything — beta serves the same landing page and the same public menus
as production, and two of each in the index is one too many.

Finally point `beta.coaster.business` at this project.

### 7. Stripe

In **test mode**: a webhook endpoint on `https://api.beta.coaster.business/api/v1/stripe/webhook`
with the same events as production, and a test price for the Pro plan. The endpoint's signing secret
is `STRIPE_WEBHOOK_SECRET`; without it every webhook is rejected and no subscription ever activates.

### 8. Your first login

The beta database is empty and `Role` defaults to `USER`, so the backoffice is closed to you until
you say otherwise. Log in once so the row exists, then:

```sql
UPDATE "User" SET role = 'ADMIN' WHERE email = 'you@example.com';
```

### 9. Close the door

Beta runs Stripe in test mode, so an open beta is the product for free. Add your own address to the
allowlist first — otherwise the switch locks you out of your own environment as soon as you sign in
from a second account:

```sh
gcloud run services update api-beta --region europe-west1 \
  --update-env-vars BETA_ALLOWLIST_ENABLED=true
```

`--update-env-vars` leaves the rest of the environment alone, and so does every later deploy from
CI, so the switch survives without going back into the console. See
[closed beta](../saas/closed-beta.md).

## Deploying

Push to `dev`. Tests, image, migrations, service — the same pipeline production gets, in the same
order, against beta's own database. Promoting is a merge into `main`.

## Checking it came up

There is no health endpoint; a 404 from Nest is the proof, because only a booted application answers
in that shape:

```sh
curl -s https://api.beta.coaster.business/api/v1/ping
# {"message":"Cannot GET /api/v1/ping","error":"Not Found","statusCode":404}

curl -s https://beta.coaster.business/robots.txt
# User-agent: *
# Disallow: /
```

Then log in on `beta.coaster.business`. If the login succeeds and every request comes back 401, the
service is missing `AUTH_JWT_SECRET` or holds a different one than the token was signed with. If the
login succeeds but a reload lands back on the login page, the refresh cookie is not reaching the
API: check that `CORS_ORIGINS` names beta's exact origin, since a credentialed request is refused
against a wildcard.
