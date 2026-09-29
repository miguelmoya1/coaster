# Development

The repository is an npm workspace with the API (`apps/api`), the web application (`apps/web`), the
shared TypeScript package (`packages/common`) and the printer bridge (`apps/printer-service`). The Go
rewrite of the API (`apps/coaster-api`) has its own page: [coaster-api](apps/coaster-api/README.md).

## Running it

The simplest thing that works is to run all of it in containers:

```sh
docker compose up
```

That brings up Postgres, Redis, the API on `:3000`, the web app on `:4200` and the Stripe CLI
forwarding webhooks. The API container applies the pending migrations before it starts serving, so
an empty database —a first checkout, or a dropped volume— comes up with its schema on its own. To
run an application on the host instead, start the infrastructure it needs and then the app:

```sh
# Start local infrastructure
docker compose up db redis

# Apply the migrations: nothing on the host does it for you
cd apps/api && npx prisma migrate deploy && cd -

# Run the Backend API
npm run dev:api

# Run the Frontend App
npm run dev:web
```

An API talking to a database with no tables in it looks like broken code rather than a missing
schema: every request dies on Prisma and the browser is told `Internal server error`, the login
included. If that is what you are seeing, that is the first thing to check.

`redis` is optional. With `REDIS_URL` unset the application behaves exactly as it did before the
cache existed: every guard reads Postgres, the rate limit counts per process, and realtime events
reach only the clients of the instance that raised them — see [the shared cache](operations/redis.md).

> **Upgrading an existing checkout:** the `db` service moved from `postgres:16-alpine` to
> `postgres:18-alpine`. A `postgres_data` volume created by 16 will not start under 18, so drop it
> once (`docker compose down -v db`) and bring it back up. The drop takes your local data with it;
> the next `docker compose up` rebuilds the schema, and on the host you apply the migrations
> yourself, as above.

To exercise Stripe locally you also need its CLI forwarding events to the API. `docker compose up`
starts a `stripe` service that does it, or run it yourself — see
[Stripe setup](saas/stripe-local-setup.md).

How each application runs on its own: [API](apps/api.md), [web](apps/web.md),
[printer bridge](apps/printer-service.md). The environment variables are in
[configuration](operations/configuration.md).

## When a change does not seem to apply

Six container traps, all of which look like broken code. Check `docker compose logs web` first: a
failed build leaves the browser on the last good bundle.

| Symptom                                                                                               | Cause                                                                                                                                                                                         | Fix                                                                                                                                                                                                                                                                                                                         |
| ----------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| The UI ignores your change                                                                            | The `ng serve` watcher kept stale contents after a file was added or deleted                                                                                                                  | `docker compose restart web`                                                                                                                                                                                                                                                                                                |
| `does not provide an export named '...'`                                                              | A stale pre-bundle of `@coaster/common`. Fixed at the root: `angular.json` now excludes it from the dev server's `prebundle`, so it is compiled with the app and picks changes up on the spot | If it ever returns, the cache is stale: `docker compose exec web rm -rf /app/apps/web/.angular/cache && docker compose restart web`. Delete it **from inside the container** — removing it from the host while the container holds it open detaches the bind mount, and everything you do afterwards on the host is ignored |
| The dev server talks to the deployed API instead of the local one                                     | `src/environments/environment.ts` is generated by `set-env.ts`, and a `PRODUCTION=true` build leaves it pointing at production                                                                | `cd apps/web && node set-env.ts && docker compose restart web`. Any of `npm run dev`, `start` or `test` regenerates it too — it is only a production **build** that leaves it behind                                                                                                                                        |
| `Cannot find module '@nestjs/...'`                                                                    | `node_modules` are anonymous volumes, so a host install is invisible inside                                                                                                                   | `docker compose exec api npm install`                                                                                                                                                                                                                                                                                       |
| The API container dies on `failed to load file`                                                       | Same watcher trap as the web one: swc keeps compiling paths that a rename or a delete moved out from under it                                                                                 | `docker compose restart api`                                                                                                                                                                                                                                                                                                |
| Tests fail on `RangeError: Offset is outside the bounds of the DataView` inside `@prisma/param-graph` | The Prisma client was generated by the container, whose `node_modules` drifted from the host's, and the unit tests run on the **host**                                                        | `cd apps/api && npx prisma generate` — `npm run db:generate` deliberately runs inside the container, for the container                                                                                                                                                                                                      |

Locked out of an account with no password on it — an invitation nobody has claimed, or a record that
predates passwords? Set one directly:

```sh
DATABASE_URL=postgres://admin:admin@localhost:5432/coaster \
  node apps/api/scripts/set-password.mjs you@example.com a-good-enough-password
```

After changing `packages/common`, rebuild it and restart the API — both apps consume its `dist`, not
its source:

```sh
npm run build -w @coaster/common && docker compose restart api
```

## Commands

- Build everything for production: `npm run build`
- Unit tests: `npm test`
- Lint (includes the layering rules on both sides): `npm run lint`
- API e2e tests: `npm run test:e2e -w @coaster/api` — brings up a database with testcontainers
- Web e2e tests: `cd apps/web && npx playwright test`
- Printer bridge tests: `cd apps/printer-service && go test ./...`
- Generate the Prisma client: `npm run db:generate` (in the container) or
  `cd apps/api && npx prisma generate` (on the host, which is where the unit tests run)
- Apply migrations: `npm run db:migrate`

CI runs all of the above except the Playwright suite, which is currently commented out in
[`ci.yml`](../.github/workflows/ci.yml).
