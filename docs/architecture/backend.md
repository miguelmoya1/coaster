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

`FirebaseTokenService` (in `core/security`) is the single place that verifies a Firebase ID token
and loads the matching local user. `JwtStrategy` (HTTP) and `SubscriptionActiveGuard` both go
through it, and each keeps its own post-conditions — active user, platform role, verified email.
Before it existed, the same verify-and-look-up pair was written out in four places.

The realtime stream adds nothing to this. It is a `GET` like any other, so `FirebaseAuthGuard` and
`EstablishmentPermissionsGuard` decide who may open it; there is no second authentication path to
keep in step with this one.

The full authorisation picture is in [access model](permissions.md).

### The shared cache

Two things used to live in the memory of one process and therefore broke the moment Cloud Run ran
more than one instance: the set of clients watching a venue, and the throttler's counter — the guards
were merely slow. All three now go through `core/cache`, and the full picture, including what is
cached and what deletes it, is in [the shared cache](../operations/redis.md).

Two things are worth knowing before reading any guard:

- **`REDIS_URL` unset means no cache at all**, and the application behaves exactly as it did before.
  Every read falls back to Postgres, rooms stay local, the throttler counts in memory. The e2e suite
  runs this way.
- **`SecurityRepository` is the only place that caches.** Every read on the authenticated preamble —
  role, membership, module list, subscription row — is a `remember` there, and
  `FirebaseTokenService` caches the user lookup behind `CurrentUser`. Nothing else in the codebase
  touches the cache to read; a handful of event handlers touch it to `forget`.

### Rate limiting

`@nestjs/throttler` is registered globally at **300 requests/minute**, counted in the shared cache so
the limit is the whole service rather than 300 per instance. If the cache is unreachable it falls
back to counting in memory rather than answering 500. Two exceptions:

- `POST /establishments/:establishmentId/ai` is capped at **20/minute** — it calls a paid LLM gateway, and without a
  tighter limit any member could burn the budget in a loop.
- The Stripe webhook and the printer bridge long-poll are exempt with `@SkipThrottle()`. Stripe
  retries on failure and the bridge holds a request open for 25 seconds by design.

### Proxies in front of the API

`TRUST_PROXY_HOPS` says how many proxies sit in front. It defaults to **1**, which is what Cloud Run
adds, so nothing needs declaring there; `compose.yaml` drops it to `0` locally.

The number matters because `req.ip` derives from it, and the rate-limit bucket derives from
`req.ip`. Fastify walks `X-Forwarded-For` from right to left, skipping the trusted hops, so with the
right number it lands on the address the proxy appended. Trusting more hops than exist — or all of
them, with `trustProxy: true` — hands it the leftmost entry, which the caller writes themselves:
rotating that header per request makes the rate limit disappear entirely.

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
