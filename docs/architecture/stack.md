# Stack

- **Monorepo:** npm workspaces for the TypeScript applications, `apps/{api,web}`. The web holds the
  API contract in each domain's `models/` (the permission table and the error codes included).
  `apps/coaster-api` is the Go rewrite of the API and `apps/database` the schema, both outside the
  workspaces — see [coaster-api](../apps/coaster-api/README.md) and [database](../apps/database.md).
- **Backend:** NestJS 11 on Fastify, CQRS + Prisma 7 over PostgreSQL. See [backend](backend.md).
- **Frontend:** Angular 22 — standalone, signals, zoneless — with Material and Tailwind CSS v4. See
  [frontend](frontend.md).
- **Identity:** our own. Password on `User`, external providers in `AuthIdentity`, sessions in
  `AuthSession`: a short access token in memory and a rotating refresh cookie that slides thirty days
  from its last use, so nobody who keeps using the app is ever asked to sign in again.
- **Storage:** signed v4 upload URLs straight to Cloud Storage, so an image never passes through the
  API.
- **Realtime and cache:** Server-Sent Events over an optional Redis bus. See
  [the shared cache](../operations/redis.md).
- **Billing:** Stripe Checkout, Customer Portal and webhooks. See
  [Stripe integration](../saas/stripe-integration.md).
- **Assistant:** the Vercel AI SDK against the AI Gateway, calling CQRS commands as tools.
- **Printer bridge:** a Go service polling a job queue from inside the venue. See
  [printing bridge](printing-bridge.md).
- **Testing:** Vitest for unit tests, Vitest + testcontainers (a real Postgres, real migrations) for
  API e2e, Playwright for the browser, `go test` for the bridge and the Go API.
- **Infrastructure:** Docker (local) · Vercel + Google Cloud Run + Neon (production). See
  [production and beta](../operations/environments.md).
