# Coaster API

`apps/api`: NestJS on Fastify, CQRS (`@nestjs/cqrs`), Prisma over PostgreSQL. Every business
capability is a module under `apps/api/src`, and every module declares its public API in its
`index.ts`.

The architecture — modules, aliases, layering, the guards, the runtime — is in
[backend architecture](../architecture/backend.md). Who is allowed to do what is in
[access model](../architecture/permissions.md).

## Running it

The API is meant to run in its container, alongside the database:

```bash
docker compose up api
```

It listens on `:3001`: the `:3000` belongs to the Go API that replaces it
([coaster-api](coaster-api/README.md)), and the web app and the Stripe CLI talk to that one.
`npm run dev:api` from the repository root starts it on the host instead, in which case
`DATABASE_URL` has to point somewhere real.

Swagger is at `http://localhost:3001/api/docs`, **outside production only**. Every route is under
`/api/v1`.

## Commands

Run from `apps/api`:

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

The variables it reads, and which ones are easy to get wrong, are in
[configuration](../operations/configuration.md).
