# Coaster API

NestJS on Fastify, CQRS (`@nestjs/cqrs`), Prisma over PostgreSQL. Every business capability is a
module under `src`, and every module declares its public API in its `index.ts`.

The architecture — modules, aliases, layering, the guards, the runtime — is in
[backend architecture](../../docs/architecture/backend.md). Who is allowed to do what is in
[access model](../../docs/architecture/permissions.md).

## Running it

The API is meant to run in its container, alongside the database:

```bash
docker compose up db api
```

`npm run dev:api` from the repository root starts it on the host instead, in which case
`DATABASE_URL` has to point somewhere real.

Swagger is at `http://localhost:3000/api/docs`, **outside production only**. Every route is under
`/api/v1`.

## Commands

| Command             | What it does                                                       |
| ------------------- | ------------------------------------------------------------------ |
| `npm run dev`       | `nest start -b swc -w`                                             |
| `npm run build`     | `nest build` — aliases are resolved at build time, `dist` is plain |
| `npm start`         | `node dist/main`                                                   |
| `npm test`          | Unit tests (Vitest, Prisma mocked)                                 |
| `npm run test:e2e`  | E2E: a real database from testcontainers, migrations applied       |
| `npm run test:cov`  | Unit tests with coverage                                           |
| `npm run db:gen`    | `prisma generate` **for wherever you run it**                      |
| `npm run db:studio` | Prisma Studio                                                      |

From the repository root, `npm run db:generate` and `npm run db:migrate` run the same Prisma
commands **inside the container**. That distinction matters: the unit tests run on the host, so a
client generated only in the container makes them fail inside `@prisma/param-graph`. Generate on
both when in doubt.

The e2e suite runs `prisma migrate deploy`, never `db push` — the schema alone leaves out everything
written in raw SQL (the append-only triggers on `TimeEntry`, the partial unique index on
`ShiftExchange`), which is exactly what is worth leaning on in a test.

## Environment

`.env` is for local development only; it is in `.gitignore` and `.dockerignore`, so it neither
travels in git nor enters the image. Production reads real environment variables — see
[production and beta](../../docs/operations/environments.md).

| Variable                                                         | Needed for                                                                     |
| ---------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| `DATABASE_URL`                                                   | Everything                                                                     |
| `AUTH_JWT_SECRET`                                                | Signing access tokens; the API refuses to start without it                     |
| `GOOGLE_CLIENT_ID`                                               | Signing in with Google; unset, that route answers 503 and the button is hidden |
| `FRONTEND_URL`                                                   | Stripe return URLs and invitation links                                        |
| `PUBLIC_URL`                                                     | Where printer bridges download updates from                                    |
| `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_PRO` | Billing                                                                        |
| `RESEND_API_KEY`                                                 | Invitations, confirmations and password resets                                 |
| `EMAIL_FROM`                                                     | The sender; defaults to `Coaster <hello@coaster.business>`                     |
| `PRINTER_JWT_SECRET`                                             | The LAN printing fallback                                                      |
| `MEDIA_BUCKET`                                                   | Signed upload URLs for product images                                          |
| `AI_GATEWAY_API_KEY`                                             | The assistant (read by the AI SDK, not by our code)                            |
| `REDIS_URL`                                                      | Optional — unset means no cache and no shared realtime bus                     |
| `CORS_ORIGINS`                                                   | Browser origins allowed to call the API; fails closed in production            |
| `TRUST_PROXY_HOPS`                                               | Defaults to `1` (Cloud Run); `compose.yaml` sets `0`                           |
| `BETA_ALLOWLIST_ENABLED`                                         | Closes sign-up to the `BetaTester` allowlist                                   |

Migrations are **not** run by the image. Apply them with `prisma migrate deploy` before or during
the release.
