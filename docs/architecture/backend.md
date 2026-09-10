# Backend architecture (NestJS)

The API is a NestJS application on Fastify, using CQRS (`@nestjs/cqrs`) and Prisma over PostgreSQL.
Each business capability is a module under `apps/api/src`.

## Modules and their public API

Every folder in `apps/api/src` is a module and declares its **public API** in its `index.ts`.
Anything not exported there is internal: repositories, handlers, DTOs and utilities are never
imported from outside the module.

Those `index.ts` files re-export straight from the file that declares each symbol
(`export { CreateOrderCommand } from './commands/impl/create-order.command';`) instead of
re-exporting the `./commands` barrel. That keeps the load graph from dragging in the handlers, which
are the files with dependencies and the ones that create cycles at `require` time.

## Aliases

One alias per module, declared **only** in `tsconfig.json`:

```text
@coaster/<module>   ->  ./src/<module>/index.ts
@coaster/core/db    ->  ./src/core/db/index.ts
```

`core/db` has its own entry point because it is the persistence layer (the generated Prisma client)
and should not travel inside the general `core` barrel.

There are no wildcard aliases (`@establishments/*`). They were a way to bypass `index.ts` and reach into
another module's internals.

Rule: **crossing modules goes through the alias; inside a module, use relative paths.**

## Layers

`core` is the base layer and **cannot import any business module**; lint enforces it. It holds the
Prisma client, the security guards, shared mappers and the token verifier.

If `core` ever needs something from above, invert the dependency with a port rather than importing
upwards.

## How it is enforced

`apps/api/eslint.config.mjs` generates its rules by reading the directories under `src`, so a new
module is covered without touching the configuration:

- error if a file in `core/` imports a business module;
- warning if a file reaches another module with a relative path instead of `@coaster/<module>`.

The second is a warning while legacy relative imports are still being migrated. Once they are gone
it becomes an error.

## Cross-cutting concerns

### Authentication

`AccessTokenService` (in `core/security`) is the single place that verifies an access token and
loads the matching local user. `AuthGuard` (HTTP) and `SubscriptionActiveGuard` both go through it,
and each keeps its own post-conditions — active user, platform role. Before it existed, the same
verify-and-look-up pair was written out in four places.

The access token is a JWT of our own, signed with `AUTH_JWT_SECRET`, alive for fifteen minutes and
carrying the user id and the session id. Nobody is asked to sign in again when it expires: the
browser holds a refresh token in an `httpOnly` cookie on `.coaster.business`, and `POST
/auth/refresh` trades it for a new pair. That cookie slides — thirty days from its **last use**, not
from the sign-in — so an account used weekly never sees the login page.

Rotation is what makes the cookie safe to keep that long. Every refresh revokes the token it was
given and issues a new one in the same **family**, so a refresh token replayed later is proof
somebody copied it, and the whole family is dropped. Two tabs refreshing at the same moment would
look exactly like that replay, so a token rotated less than thirty seconds ago is let through
instead. A logout is not a race and is not forgiven: it sets `revokedAt`, which the refresh refuses
before it ever looks at the grace window. That is why `AuthSession` carries `rotatedAt` and
`revokedAt` as separate columns.

### Signing in with Google

`GoogleTokenService` verifies the identity token the browser gets from Google Identity Services:
`RS256` against Google's published keys, `aud` equal to `GOOGLE_CLIENT_ID`, a Google issuer, an
expiry in the future and an address Google says it verified. Anything else is refused. The keys are
read once and kept in memory, and a token naming a key Google does not publish cannot make the API
fetch them again more than once a minute — otherwise a stream of forged `kid`s would be a way to
make us hammer Google.

There is no `GOOGLE_CLIENT_ID` in development by default, and that is not a failure: the API answers
`503 GOOGLE_SIGN_IN_UNAVAILABLE` and the web app renders no button at all, rather than offering
something that cannot work.

Three things can happen when a verified Google identity arrives:

- **The identity is already linked.** Sign in, and stamp `lastLoginAt`.
- **The address has an account.** Link the identity to it. This is the path every account that
  predates our own sign-in takes, and the one an invitation takes: the record exists, the person
  proves the address, they get in.
- **Nobody has that address.** Open an account, already verified, with the identity attached.

The second case has a sharp edge. Registration does not verify the address, so somebody could sign
up with an address that is not theirs. When Google later proves that address belongs to someone
else, the password on the record was set by a person who never showed they owned the mailbox: it is
dropped, along with every session it opened. An address that had already been verified keeps its
password, so nobody who legitimately set one loses it.

Signing in never rewrites the account's email. The identity is keyed on Google's `sub`, which does
not move, and changing the address of an account is a deliberate act rather than a side effect of
arriving.

### Links that arrive by email

`AuthToken` is one table for three jobs, told apart by `purpose`: confirming an address, choosing a
new password, and claiming an invitation. They only differ in how long they live — an hour, a day, a
week — which is a lookup table, not a branch.

Three rules hold for all of them, and they are what makes a link safe to put in an email:

- **Only the hash is stored.** A leaked database backup hands nobody a working link.
- **Issuing burns the previous one.** Asking for a second reset link kills the first, so an old
  email left in an inbox stops working the moment a newer one is sent.
- **Spending is a compare-and-swap.** `UPDATE … WHERE usedAt IS NULL` returning one row is what
  authorises the change, so two clicks arriving together cannot both win.

A link that reaches an inbox is proof the address belongs to whoever opened it, so redeeming a reset
or an invitation also marks the address verified. A reset closes **every** session, because the
password it replaces may be in the wrong hands. Setting a password from the account page closes
every session **but the one doing it** — that is what the `sid` claim in the access token is for.

### What email failures do, and do not, take down

Sending goes through `AUTH_MAILER`, a token declared in `core` and implemented by the email module.
The direction matters: `email` may depend on `auth`, never the reverse, or the two barrels form a
require-time cycle. It also lets the e2e suite swap in a mailbox and follow the links it captures,
which is how the recovery flows are tested end to end without sending anything.

Where the person is waiting on the email, a failure to send is an error they see: `forgot-password`
and the verification request both fail loudly rather than answering 204 to somebody who will then
wait forever for a message that never left. Where the email is a **notice** — the warning that a
password changed — the send is best-effort and only logged, because the password has already
changed and refusing to say so would not undo it.

The realtime stream adds nothing to this. It is a `GET` like any other, so `AuthGuard` and
`EstablishmentPermissionsGuard` decide who may open it; there is no second authentication path to
keep in step with this one.

The full authorisation picture — five guards, in the order Nest runs them — is in
[access model](permissions.md).

### What is reachable without a token

Three surfaces, and each one is deliberate:

- `GET /menus/:slug` — the published menu a customer scans. Outside every guard, and throttled on
  its own at 60/minute because it is the first thing a stranger can reach. A spec asserts it carries
  no guards, so it cannot acquire one by accident either.
- The printer bridge's routes, which authenticate per device with `X-Device-Key` rather than per
  user — see [printing bridge](printing-bridge.md).
- `POST /stripe/webhook`, where the signature is the gate.

### The shared cache

Two things used to live in the memory of one process and therefore broke the moment Cloud Run ran
more than one instance: the set of clients watching a venue, and the throttler's counter — the guards
were merely slow. Both now go through `core/cache`, and the full picture, including what is cached
and what deletes it, is in [the shared cache](../operations/redis.md).

Two things are worth knowing before reading any guard:

- **`REDIS_URL` unset means no cache at all**, and the application behaves exactly as it did before.
  Every read falls back to Postgres, rooms stay local, the throttler counts in memory. The e2e suite
  runs this way.
- **`SecurityRepository` is the only place that caches.** Every read on the authenticated preamble —
  role, membership, module list, subscription row — is a `remember` there, and
  `AccessTokenService` caches the user lookup behind `CurrentUser`. Nothing else in the codebase
  touches the cache to read; a handful of event handlers touch it to `forget`.

### Rate limiting

`@nestjs/throttler` is registered globally at **300 requests/minute**, counted in the shared cache so
the limit is the whole service rather than 300 per instance. If the cache is unreachable it falls
back to counting in memory rather than answering 500. Two exceptions:

- `POST /establishments/:establishmentId/ai` is capped at **20/minute** — it calls a paid LLM gateway, and without a
  tighter limit any member could burn the budget in a loop.
- The Stripe webhook and the printer bridge long-poll are exempt with `@SkipThrottle()`. Stripe
  retries on failure and the bridge holds a request open for 25 seconds by design.

### Cross-origin requests

`CORS_ORIGINS` is a comma-separated allowlist, and there is no wildcard anywhere: `origin: '*'` used
to be the setting, which meant any page on the internet could call the API with a token it had got
hold of, and — once the realtime stream arrived — hold a stream open too.

It **fails closed in production**. An unset variable resolves to an empty list, every cross-origin
request is refused, and the boot logs an error naming the variable. That is deliberate and follows
the same lesson as `AdminGuard`: a security control that falls back to permissive when
misconfigured protects nothing, and the failure is invisible precisely when it matters. Outside
production it falls back to `http://localhost:4200`, so a fresh checkout and CI need no
configuration.

Set it **before** deploying the change, not after — the variable is ignored by any revision that
predates it, so there is no window where the two disagree.

Its value contains commas, which is exactly what `gcloud`'s env-var flags use to separate one
variable from the next. Passed plainly, `CORS_ORIGINS=https://a,https://b` silently becomes two
variables and the allowlist ends up holding one origin. Declare another delimiter with the `^d^`
prefix:

```bash
gcloud run services update api-new --region europe-west1 \
  --update-env-vars "^@^CORS_ORIGINS=https://www.coaster.business,https://coaster.business"
```

The `--env-vars-file` form used in [production and beta](../operations/environments.md) does not have
the problem, because YAML quotes the value.

The list needs every origin a browser loads the app from, which includes the apex if the site
answers there: the public menu at `/m/:slug` is a normal cross-origin caller like every other page.
The printer bridge is not affected — it is a Go process, not a browser, and authenticates with
`X-Device-Key`.

### Proxies in front of the API

`TRUST_PROXY_HOPS` says how many proxies sit in front. It defaults to **1**, which is what Cloud Run
adds, so nothing needs declaring there; `compose.yaml` drops it to `0` locally.

The number matters because `req.ip` derives from it, and the rate-limit bucket derives from
`req.ip`. Fastify walks `X-Forwarded-For` from right to left, skipping the trusted hops, so with the
right number it lands on the address the proxy appended. Trusting more hops than exist — or all of
them, with `trustProxy: true` — hands it the leftmost entry, which the caller writes themselves:
rotating that header per request makes the rate limit disappear entirely.

Fastify 5.12 stopped accepting a number here: a hop count cannot validate the immediate peer, so it
answers "trust nobody" and `req.ip` becomes the proxy — one shared rate-limit bucket for everybody.
The count is expressed as a function instead, `(_address, hop) => hop < hops`, which walks the same
way on 5.11 and on 5.12. Do not put a number back.

To check the number is right against a deployed API, hammer it with a rotating header and look for
`429`. If every response is identical, there is one more hop than you think:

```bash
for i in $(seq 1 310); do curl -s -o /dev/null -w "%{http_code}\n" -H "X-Forwarded-For: 10.0.0.$i" https://your-api/api/v1/establishments; done | sort | uniq -c
```

### API docs

Swagger is mounted at `/api/docs` **only outside production**. It is a complete map of the API and
there is no reason to publish it.

## Runtime

TypeScript aliases are compile-time only. Nest's SWC builder resolves them at build time: there is
no unresolved `require("@coaster/...")` left in `dist`, so `node dist/main` runs without
`tsconfig-paths` or any extra loader.

The production image runs as the `node` user and expects migrations to have been applied separately
(`prisma migrate deploy`).

## Tests

`vitest.config.ts` and `vitest.config.e2e.ts` read the `paths` from `tsconfig.json` and build their
aliases from there. There is no second list to keep in sync.

The e2e suite (`npm run test:e2e -w @coaster/api`) runs in CI and brings the database up with
`prisma migrate deploy`, not `db push`: the schema on its own leaves out everything written in raw
SQL — the append-only triggers on `TimeEntry`, the partial unique index on `ShiftExchange` — and
those are exactly the invariants worth being able to lean on in a test.

This distinction is not academic. Unit tests mock Prisma, so `$executeRaw` is a `vi.fn()` and a type
error inside raw SQL is invisible to them. A `WHERE id = $1::uuid` against a `text` column passed
every unit test and only failed against a real database.

To exercise something between two people, `E2eTestSetup.actAs(user)` returns the `x-e2e-user-id`
header the mocked guard uses to impersonate; without it everything runs as `mockUser`. Test establishments are
created with `E2eTestSetup.createEstablishment()`, which mirrors `EstablishmentWriteRepository.create`: establishment, owner
membership and a 14-day trial subscription. Creating establishments with a bare `prisma.dbEstablishment.create` leaves
them without a subscription and `SubscriptionActiveGuard` answers 402 to every write.

The realtime stream is tested over real HTTP in `test/realtime`: the suite opens the endpoint with
`fetch`, reads the frames off the body and checks that a non-member is refused, that an event never
crosses to another establishment, and that revoking access closes the stream.
