# 🍺 Coaster (BarTeam)

## 📖 What is Coaster?

Coaster is an operational tool for small hospitality businesses — bars, restaurants and cafes. It
covers the floor (tables, orders, payments) and the back office (staff, rota, stock), so a venue can
run its day without WhatsApp groups and paper.

It is sold as a SaaS: each venue subscribes to a plan, and the platform is operated from an internal
admin backoffice.

## ✨ What Can Coaster Do?

### 🍸 Floor Module (Orders & Tables)

- **Tables:** open, occupy and free tables; move an order between tables; merge orders.
- **Orders:** add items, track what has been served and what has been paid, line by line.
- **Payments:** cash, card or split; partial payments, tips and per-order or per-item adjustments.
- **Receipts:** print to a local thermal printer through the printer bridge.

### 📅 HR Module (The Schedule)

- **Multi-view Calendar:** daily, weekly and monthly shift views.
- **Shift Assignment:** owners and managers create shifts and assign them to staff.
- **Shift Marketplace:** staff can drop a shift for someone else to pick up.
- **Staff Management:** three roles per venue — `OWNER`, `MANAGER` and `STAFF`.

### ⏱️ Time Tracking (Legal Working-Time Register)

The register required by art. 34.9 of the Spanish Workers' Statute: append-only marks enforced by
database triggers, corrections that never overwrite the original and carry who/when/what/why, a
per-establishment hash chain, CSV export over any date range for labour inspections, and the rota contrasted
against what was actually worked.

See [time tracking](docs/operations/time-tracking.md).

### 📦 Inventory Module

- **Visual Catalog:** large icons for fast use on touch screens.
- **Traffic Light System:** stock state at a glance — OK, low, or out.
- **Smart Ordering:** groups missing items into a message ready to send to a supplier.

### 🤖 Voice Assistant

An in-app assistant that reads the venue's live state and executes actions on it, bounded by the
caller's own permissions.

### 🛡️ Admin Backoffice

Platform operations at `/admin`, for users with the `ADMIN` role: metrics, venue and user
management, granting PRO by hand without Stripe, and an audit log of every action taken.

See [backoffice](docs/admin/backoffice.md).

### 🔔 Real-Time

Live updates over WebSockets (socket.io): orders, tables, stock, members and subscription changes
propagate to everyone connected to the venue.

---

## 🔐 Access Model

Three independent axes, all of which a request must pass:

| Axis          | Values                      |
| ------------- | --------------------------- |
| Platform role | `USER`, `ADMIN`             |
| Venue role    | `OWNER`, `MANAGER`, `STAFF` |
| Subscription  | Stripe, manual grant, none  |

An unpaid venue keeps **read** access to its history — it only loses writes. Full detail in
[Access model](docs/architecture/permissions.md).

---

## 🛠️ The Golden Stack (Architecture)

- **Monorepo Strategy:** npm workspaces.
- **Backend:** NestJS (CQRS) + Prisma ORM + PostgreSQL.
- **Frontend:** Angular 22 + Tailwind CSS v4 + Signals.
- **Billing:** Stripe Checkout, Customer Portal and webhooks.
- **Printer bridge:** Go service polling a job queue.
- **Testing:** Vitest (unit) + Supertest/Playwright (E2E).
- **Infrastructure:** Docker (local) / Google Cloud Run + Neon (production).

Architecture notes live in [`docs/`](docs/README.md).

---

## 🚀 Getting Started & Running Tasks

The repository is an npm workspace containing the API, web application, shared TypeScript package,
Firebase emulator, and printer service.

### Run the Dev Servers

To run the frontend/backend servers for your app, use:

```sh
# Start local infrastructure
docker compose up db firebase

# Run the Backend API
npm run dev:api

# Run the Frontend App
npm run dev:web
```

> **Upgrading an existing checkout:** the `db` service moved from `postgres:16-alpine` to
> `postgres:18-alpine`. A `postgres_data` volume created by 16 will not start under 18, so drop it
> once (`docker compose down -v db`) and let the migrations rebuild your local database.

To exercise Stripe locally you also need its CLI forwarding events to the API. `docker compose up`
starts a `stripe` service that does it, or run it yourself — see
[Stripe setup](docs/saas/stripe-local-setup.md).

### When a change does not seem to apply

Six container traps, all of which look like broken code. Check
`docker compose logs web` first: a failed build leaves the browser on the last good bundle.

| Symptom                                                                                               | Cause                                                                                                                                                                                                           | Fix                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| ----------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| The UI ignores your change                                                                            | The `ng serve` watcher kept stale contents after a file was added or deleted                                                                                                                                    | `docker compose restart web`                                                                                                                                                                                                                                                                                                                                                                                                                  |
| `does not provide an export named '...'`                                                              | A stale pre-bundle of `@coaster/common`. Fixed at the root: `angular.json` now excludes it from the dev server's `prebundle`, so it is compiled with the app and picks changes up on the spot                    | If it ever returns, the cache is stale: `docker compose exec web rm -rf /app/apps/web/.angular/cache && docker compose restart web`. Delete it **from inside the container** — removing it from the host while the container holds it open detaches the bind mount, and everything you do afterwards on the host is ignored                                                                                                                    |
| Google sign-in opens and closes, and `window.__TEST_LOGIN__` is gone                                  | `src/environments/environment.ts` is generated by `set-env.ts`, and a `PRODUCTION=true` build leaves it that way. The dev server then runs against the real Firebase project with no emulator and no test hooks | `cd apps/web && node set-env.ts && docker compose restart web`. Any of `npm run dev`, `start` or `test` regenerates it too — it is only a production **build** that leaves it behind                                                                                                                                                                                                                                                          |
| `Cannot find module '@nestjs/...'`                                                                    | `node_modules` are anonymous volumes, so a host install is invisible inside                                                                                                                                     | `docker compose exec api npm install`                                                                                                                                                                                                                                                                                                                                                                                                         |
| The API container dies on `failed to load file`                                                       | Same watcher trap as the web one: swc keeps compiling paths that a rename or a delete moved out from under it                                                                                                   | `docker compose restart api`                                                                                                                                                                                                                                                                                                                                                                                                                  |
| Tests fail on `RangeError: Offset is outside the bounds of the DataView` inside `@prisma/param-graph` | The Prisma client was generated by the container, whose `node_modules` drifted from the host's, and the unit tests run on the **host**                                                                          | `cd apps/api && npx prisma generate` — `npm run db:generate` deliberately runs inside the container, for the container                                                                                                                                                                                                                                                                                                                        |

Signing in stops working after the Firebase emulator restarts, because it keeps no accounts: the next
sign-in gets a new id, and `SyncUserHandler` refuses to move an email onto a different account. Clear
the stored id once so the next sign-in claims it again:

```sh
docker compose exec db psql -U admin -d coaster -c "UPDATE \"User\" SET \"googleId\" = NULL WHERE email = 'you@example.com'"
```

After changing `packages/common`, rebuild it and restart the API — both apps consume its `dist`, not
its source:

```sh
npm run build -w @coaster/common && docker compose restart api
```

### Build for Production

To create a production bundle:

```sh
npm run build
```

### Useful Commands

- Run Unit Tests: `npm test`
- Run API E2E Tests: `npm run test:e2e -w @coaster/api`
- Run Web E2E Tests: `cd apps/web && npx playwright test`
- Run Printer Tests: `cd apps/printer-service && go test ./...`
- Generate Prisma Client: `npm run db:generate`
- Apply Migrations: `npm run db:migrate`

### Deploying

The web app goes to Vercel, the API to Google Cloud Run, the database is Neon.

Environment variables that are easy to get wrong:

| Variable                | Where     | Why it matters                                                                                                                                        |
| ----------------------- | --------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| `PRODUCTION`            | web build | The build refuses to run without it, so a production bundle can never be silently built as a development one                                          |
| `USE_EMULATORS`         | web build | Must be `false` in production; the build refuses the combination                                                                                      |
| `TRUST_PROXY_HOPS`      | API       | Defaults to `1`, correct for Cloud Run. Too high and the rate limit counts a header the caller controls — see [backend](docs/architecture/backend.md) |
| `PUBLIC_URL`            | API       | Where printer bridges download updates from; `localhost` reaches no venue                                                                             |
| `STRIPE_WEBHOOK_SECRET` | API       | Without it every webhook is rejected and subscriptions never activate                                                                                 |
| `REDIS_URL`             | API       | Optional. Unset, rooms and the rate limit stay per-instance and every guard reads Postgres — see [the shared cache](docs/operations/redis.md)          |

Migrations are not run by the image. Apply them with `prisma migrate deploy` before or during the
release.

## 📚 Documentation

- [Access model](docs/architecture/permissions.md) — roles, guards and plan grants
- [Backend architecture](docs/architecture/backend.md)
- [Frontend architecture](docs/architecture/frontend.md)
- [Domain models](docs/architecture/domain-models.md)
- [Time tracking](docs/operations/time-tracking.md)
- [Printing bridge](docs/architecture/printing-bridge.md)
- [Stripe integration](docs/saas/stripe-integration.md) · [Stripe setup](docs/saas/stripe-local-setup.md)
- [Admin backoffice](docs/admin/backoffice.md)
- [Roadmap](docs/roadmap.md)
