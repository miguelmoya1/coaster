# Production and beta

Two environments run the same code from two branches. `main` is production, `dev` is beta. They
share one GCP project, one Artifact Registry image and one Firebase project; everything else is
duplicated, and the things that **must** be duplicated are listed below with the reason.

|                    | Production                          | Beta                                             |
| ------------------ | ----------------------------------- | ------------------------------------------------ |
| Branch             | `main`                              | `dev`                                            |
| Web                | `www.coaster.business` (Vercel)     | `beta.coaster.business` (its own Vercel project) |
| API                | `api.coaster.business`              | `api.beta.coaster.business`                      |
| Cloud Run service  | `api-new` · `europe-west1`          | `api-beta` · `europe-west1`                      |
| Migration job      | `api-migrate` · `europe-southwest1` | `api-migrate-beta` · `europe-southwest1`         |
| Database           | its own Neon project                | its own Neon project                             |
| Firebase           | `coaster-437f2`                     | `coaster-437f2` — the same one                   |
| Stripe             | live keys                           | test keys                                        |
| GitHub environment | `api-production`                    | `api-beta`                                       |
| Search engines     | indexed                             | `ALLOW_INDEXING=false`                           |

## One workflow, two environments

`deploy-backend` in [ci.yml](../../.github/workflows/ci.yml) runs on every push to `main` and to
`dev`, and the branch chooses the GitHub environment:

```yaml
environment: ${{ github.ref_name == 'main' && 'api-production' || 'api-beta' }}
```

From there the job body never mentions an environment again: the service name, the job name and
`PUBLIC_URL` come from `vars`, the database URL from `secrets`, and both resolve to whatever that
environment holds. A deploy to beta and a deploy to production are the same twelve lines.

The first step fails the run if any of the four is empty, before a single `gcloud` call. A GitHub
environment that was never configured cannot half-deploy anything.

**What lives where:**

| Value                                                       | Where it is set                  | Why there                                                        |
| ----------------------------------------------------------- | -------------------------------- | ---------------------------------------------------------------- |
| `GCP_SERVICE_NAME`, `GCP_JOB_NAME`, `PUBLIC_URL`            | GitHub environment **variables** | CI needs them to know what it is deploying                       |
| `DATABASE_URL`                                              | GitHub environment **secret**    | CI hands it to the migration job; the service holds its own copy |
| `FRONTEND_URL`, `STRIPE_*`, `RESEND_API_KEY`, `REDIS_URL` … | The Cloud Run service            | Runtime configuration, never needed to build or release          |
| `PRODUCTION`, `API_URL`, `FIREBASE_*`, `ALLOW_INDEXING`     | Vercel project                   | Baked into the bundle at build time by `set-env.ts`              |

## What the two environments must never share

**The cache.** Cache keys carry no environment. `user:firebase:{uid}` is the _same key_ in both,
because both trust the same Firebase project — one Redis between them and a beta request can be
served a production user row, whose ids belong to a database beta has never seen. Beta gets its own
Redis, or none: with `REDIS_URL` unset it simply reads Postgres, which is what the whole application
did until recently. See [the shared cache](redis.md).

**The database.** Beta runs migrations that have not been through production yet. That is the point
of it.

**`PRINTER_JWT_SECRET`.** It signs the token a printer bridge carries. Shared, a pairing done in
beta prints on a real venue's printer.

**Stripe.** Beta uses test-mode keys, its own webhook endpoint (`https://api.beta.coaster.business/api/v1/stripe/webhook`)
and the signing secret that endpoint gives you. A beta checkout must not be able to charge a card.

**`RESEND_API_KEY`.** Invitations from beta are real emails to real people. A separate key keeps the
quota and the audit trail separate, and lets you revoke beta without touching production. The link
in the email follows `FRONTEND_URL`, so it lands in the environment that sent it.

Firebase is deliberately shared: the API only calls `verifyIdToken`, it never creates or deletes an
account, so beta cannot damage a production login. One Google account, two environments, two
separate `User` rows.

## Setting beta up from scratch

Everything below is done once. `gcloud`, `gh` and `vercel` all assume you are logged in.

### 1. GitHub environments — do this first

The workflow refuses to deploy an environment it cannot read, **including production**. Configure
both before merging to `main`.

```sh
gh api -X PUT repos/miguelmoya1/coaster/environments/api-production
gh variable set GCP_SERVICE_NAME --env api-production --body api-new
gh variable set GCP_JOB_NAME     --env api-production --body api-migrate
gh variable set PUBLIC_URL       --env api-production --body https://api.coaster.business
gh secret   set DATABASE_URL     --env api-production   # paste the production Neon URL

gh api -X PUT repos/miguelmoya1/coaster/environments/api-beta
gh variable set GCP_SERVICE_NAME --env api-beta --body api-beta
gh variable set GCP_JOB_NAME     --env api-beta --body api-migrate-beta
gh variable set PUBLIC_URL       --env api-beta --body https://api.beta.coaster.business
gh secret   set DATABASE_URL     --env api-beta         # paste the beta Neon URL
```

An environment secret shadows a repository secret of the same name, so the old repository-level
`DATABASE_URL` is now dead weight — delete it once production has deployed green, or it will quietly
become the value nobody remembers setting.

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

Beta copies production's shape — same service account, so signed upload URLs and Firebase Admin work
without a single new IAM binding — and starts on production's current image, which the first `dev`
push replaces.

```sh
REGION=europe-west1
IMAGE=$(gcloud run services describe api-new --region $REGION --format='value(spec.template.spec.containers[0].image)')
SA=$(gcloud run services describe api-new --region $REGION --format='value(spec.template.spec.serviceAccountName)')
```

If `$SA` comes back empty, production runs as the project's default compute account: drop the
`--service-account` flag below and beta will do the same.

Write the runtime configuration to a file — commas in a connection string make `--set-env-vars`
unusable, and the file is easy to read before you apply it:

```yaml
# /tmp/api-beta.env.yaml — delete it afterwards, it holds secrets
DATABASE_URL: 'postgresql://…beta neon…'
FRONTEND_URL: 'https://beta.coaster.business'
PUBLIC_URL: 'https://api.beta.coaster.business'
RESEND_API_KEY: 're_…'
STRIPE_SECRET_KEY: 'sk_test_…'
STRIPE_WEBHOOK_SECRET: 'whsec_…'
STRIPE_PRICE_PRO: 'price_…'
PRINTER_JWT_SECRET: '…openssl rand -hex 32…'
MEDIA_BUCKET: 'coaster-media-beta'
AI_GATEWAY_API_KEY: '…'
REDIS_URL: 'rediss://…beta…'
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

The migration job carries no configuration of its own — CI overwrites its image and its
`DATABASE_URL` on every run — so it only has to exist:

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

| Variable                       | Value                               |
| ------------------------------ | ----------------------------------- |
| `PRODUCTION`                   | `true`                              |
| `USE_EMULATORS`                | `false`                             |
| `API_URL`                      | `https://api.beta.coaster.business` |
| `ALLOW_INDEXING`               | `false`                             |
| `DEFAULT_LANGUAGE`             | same as production                  |
| `FIREBASE_API_KEY` and friends | same as production                  |

`PRODUCTION=true` is what keeps the `__TEST_LOGIN__` backdoor out of the bundle; beta is a real
build for real people, not a development one. `ALLOW_INDEXING=false` makes `set-env.ts` write a
`robots.txt` that disallows everything — beta serves the same landing page and the same public menus
as production, and two of each in the index is one too many.

Finally point `beta.coaster.business` at this project.

### 7. Firebase

Add `beta.coaster.business` to **Authentication → Settings → Authorized domains**. Without it Google
sign-in fails on beta with `auth/unauthorized-domain` and nothing else in the app works.

### 8. Stripe

In **test mode**: a webhook endpoint on `https://api.beta.coaster.business/api/v1/stripe/webhook`
with the same events as production, and a test price for the Pro plan. The endpoint's signing secret
is `STRIPE_WEBHOOK_SECRET`; without it every webhook is rejected and no subscription ever activates.

### 9. Your first login

The beta database is empty and `Role` defaults to `USER`, so the backoffice is closed to you until
you say otherwise. Log in once so the row exists, then:

```sql
UPDATE "User" SET role = 'ADMIN' WHERE email = 'you@example.com';
```

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

Then log in on `beta.coaster.business`. If Google sign-in fails, the domain is missing from
Firebase's authorized list; if the login succeeds and every request comes back 401, the API is
verifying tokens against a different project than the bundle is signing them with.
