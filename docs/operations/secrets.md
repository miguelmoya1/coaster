# Secrets

Eight values can do real damage if they leak, and they live in
[Secret Manager](https://console.cloud.google.com/security/secret-manager?project=coaster-437f2),
one copy per environment. Everything else the API reads is an ordinary environment variable on the
Cloud Run service, because it is configuration rather than a credential and hiding it only makes it
harder to read.

Nothing in the application knows any of this. Cloud Run resolves a secret and hands it to the
container as an environment variable, `ConfigService` reads `process.env` the way it always did, and
a local `.env` is still a local `.env`. The whole change lives in the service's configuration and in
[ci.yml](../../.github/workflows/ci.yml).

## What is in there

| Variable                | Why it is a secret                                                                           |
| ----------------------- | -------------------------------------------------------------------------------------------- |
| `DATABASE_URL`          | The Neon password. Everything any customer ever typed is behind it                           |
| `AUTH_JWT_SECRET`       | Signs the access tokens; holding it is being able to be anybody                              |
| `PRINTER_JWT_SECRET`    | Signs the token a printer bridge carries                                                     |
| `STRIPE_SECRET_KEY`     | In production it is a live key, and a live key moves money                                   |
| `STRIPE_WEBHOOK_SECRET` | It is what tells a real Stripe event from a forged one — a forged one is a free subscription |
| `RESEND_API_KEY`        | Sends mail signed as `coaster.business`, to anyone                                           |
| `AI_GATEWAY_API_KEY`    | Billable usage on somebody else's meter                                                      |
| `REDIS_URL`             | The password is inside the URL                                                               |

The first six are **required**: CI refuses to deploy an environment that is missing one. The last
two are **optional**, because beta is allowed to run without a cache and without the assistant —
that is the same `REDIS_URL` unset that [the shared cache](redis.md) describes, and the API says so
in its logs on the way up.

## What is deliberately not in there

`PUBLIC_URL`, `FRONTEND_URL`, `CORS_ORIGINS`, `MEDIA_BUCKET`, `TRUST_PROXY_HOPS`,
`BETA_ALLOWLIST_ENABLED`, `EMAIL_FROM`, the `PRO_*` prices and the AI quotas are configuration. You
want to read them at a glance in the console, and knowing them buys an attacker nothing.

Two look like credentials and are not:

- **`STRIPE_PRICE_PRO`** is an identifier that travels to the browser on every checkout. It is also
  the value you change most often, and the one whose change has a procedure attached — see the
  `STRIPE_PRICE_PRO_LEGACY` row in the [README](../../README.md).
- **`GOOGLE_CLIENT_ID`** ships inside the Angular bundle by design. It is public, it is the same in
  both environments, and what protects it is the authorized-origins list on the OAuth client.

## Names

`coaster-<env>-<variable in kebab-case>`, so `AUTH_JWT_SECRET` in beta is
`coaster-beta-auth-jwt-secret` and in production `coaster-prod-auth-jwt-secret`. The rule is
mechanical on purpose: the deploy derives every name with one `tr`, and there is no table anywhere
that can drift from reality.

A secret is a project-wide resource and its _versions_ are for rotation, not for environments —
there is no way to give one secret a production value and a beta value. So the two environments are
two sets of eight, and the prefix is what keeps them apart. This is not bookkeeping: every reason in
[what the two environments must never share](environments.md#what-the-two-environments-must-never-share)
applies here, and a shared `PRINTER_JWT_SECRET` is a beta pairing printing on a real venue's
printer.

The branch picks the prefix, in the same line-of-sight place it already picks the GitHub
environment:

```yaml
environment: ${{ github.ref_name == 'main' && 'api-production' || 'api-beta' }}
env:
  SECRET_PREFIX: ${{ github.ref_name == 'main' && 'coaster-prod' || 'coaster-beta' }}
```

There is nothing to configure and nothing to forget.

## Migrating an environment

One command, once per environment:

```sh
scripts/secrets-bootstrap.sh prod
```

It reads the values off the Cloud Run service — they are already there, which is the whole point —
creates a secret for each and lets the service account read it. Nothing is retyped, so nothing is
mistyped, and a mistyped `STRIPE_WEBHOOK_SECRET` is subscriptions that quietly stop activating.

**It does not touch the service.** Running it changes nothing that is serving traffic; the deploy is
what switches over, and undoing that is rolling back a revision like any other. So there is no order
to respect and no window to close — run it before the merge or after, and a merge that arrives first
just fails the check step and waits for you.

Safe to run twice: a secret that already exists is left alone, so it can never undo a rotation.

A second argument, a `KEY=value` file, fills in whatever the service is not already running on — a
credential you are introducing, or an environment built from nothing. What is in the file wins. Keep
it outside the repository and delete it afterwards.

```sh
scripts/secrets-bootstrap.sh beta ./new-values.env
```

### After both environments are on it

Delete the `DATABASE_URL` secret from both GitHub environments. It is the database password, and the
old workflow copied it into a runner's environment on every single push; nothing reads it now.

```sh
gh secret delete DATABASE_URL --env api-beta
gh secret delete DATABASE_URL --env api-production
```

### Why the plaintext copies go

A literal left behind is the password still sitting in the service YAML, readable by anyone with
`run.services.get`, and you would have done all of this for nothing. So before deploying, the
workflow asks the service and the job which of the eight they still carry as plaintext, and removes
exactly those.

Exactly those, and not the eight names flatly, because after the first deploy they are secrets
rather than literals and there is nothing left to remove: a steady-state deploy passes no removal
flag at all, and the one deploy per environment that does is the one that replaces them. The check
is not just tidiness either — it is what strips a credential somebody sets by hand in the console,
on the next deploy, instead of letting it sit there.

## Rotating

Add a version and force a new revision:

```sh
printf '%s' 'the new value' | gcloud secrets versions add coaster-prod-auth-jwt-secret --data-file=-
gcloud run services update api-new --region europe-west1 --update-secrets=AUTH_JWT_SECRET=coaster-prod-auth-jwt-secret:latest
```

`printf`, not `echo`: `echo` appends a newline, and a newline on the end of a connection string is a
connection string that no longer parses, invisibly, everywhere you look at it.

The second command is not optional. Everything is wired to `:latest`, which is resolved **when an
instance starts**, so the instances already running keep the old value until they are replaced. The
update is what replaces them. A deploy does it too, which is why a rotation right before a release
needs no second thought.

Rotating `AUTH_JWT_SECRET` signs everybody out, which is the point of rotating it.

Old versions cost the same as current ones, so disable them once the new one has proven itself:

```sh
gcloud secrets versions disable 3 --secret=coaster-prod-auth-jwt-secret
```

Disable rather than destroy: a disabled version comes back in one command if the new value turns out
to be wrong.

## Adding a ninth

1. Add the variable to `REQUIRED` or `OPTIONAL` in both `scripts/secrets-bootstrap.sh` and the
   `Resolve the Secret Manager mapping` step of `ci.yml`. Optional unless the API genuinely cannot
   serve without it — a required secret missing in either environment blocks that environment's
   deploys.
2. Create it in **both** environments, with the naming rule, and grant the runtime service account
   `roles/secretmanager.secretAccessor` on each — `scripts/secrets-bootstrap.sh <env> ./values.env`
   with the new value in the file does all of that.
3. Add the row to the table at the top of this page.

Required and only in production is the shape that bites: beta goes red on its next push and the
message will be about a secret you were sure you had created.

## Who can read them

Access is granted per secret to the service account the Cloud Run service runs as, never at the
project level. `github-actions@` deploys but holds no `secretAccessor`: it passes names around and
never sees a value, which is what makes a workflow log safe to read.

One caveat worth knowing rather than discovering: **beta and production currently run as the same
service account**, because beta was built to copy production's shape and inherit its Cloud Storage
bindings. Per-secret grants are still right — they are what keeps a future third environment out —
but they are not, today, a wall between beta and production. Giving beta its own service account is
a worthwhile afternoon and needs its own bucket bindings; it is not done.

## When a deploy fails on this

| What you see                                                       | What it is                                                                                                                                             |
| ------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `missing in Secret Manager: …` before the image is built           | The secret does not exist under that prefix. Run the bootstrap script for that environment                                                             |
| The revision fails to start, logs mention a permission on a secret | The runtime service account has no `secretAccessor` on it. Re-running the bootstrap script grants it                                                   |
| The API is up but something is wrong with a value                  | Check the wiring, never the value: `gcloud run services describe api-new --region europe-west1 --format='value(spec.template.spec.containers[0].env)'` |

A missing or unreadable secret fails the revision rather than starting the API without it, so
production keeps serving the previous revision while you sort it out.

## Cost

Around sixteen active versions, six of which are free, at $0.06 a month each — under a euro a month.
Access is billed per operation and happens when an instance starts, which at this scale rounds to
nothing.
