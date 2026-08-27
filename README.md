# 🍺 Coaster (BarTeam)

## 📖 What is Coaster?

Coaster is an operational tool for small hospitality businesses — bars, restaurants and cafes. It
covers the floor (tables, orders, payments) and the back office (staff, rota, stock), so a venue can
run its day without WhatsApp groups and paper.

It is sold as a SaaS: each venue subscribes to a plan, and the platform is operated from an internal
admin backoffice. It is currently in **closed beta** — while `BETA_ALLOWLIST_ENABLED` is on, only
addresses on the allowlist can open a new account, and people invited to an existing venue are
unaffected. See [closed beta](docs/saas/closed-beta.md).

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

The register required by art. 34.9 of the Spanish Workers' Statute: append-only marks, corrections
that never overwrite the original and carry who/when/what/why, a hash chain over every mark, CSV
export for labour inspections, and the rota contrasted against what was actually worked.

**It is kept by [Fichit](docs/operations/fichit-integration.md), not by Coaster.** Coaster owns who
may clock and who may correct; Fichit owns the register itself. The clock-in goes from the worker's
browser straight there, so a Coaster outage never stops anyone meeting a legal duty.

### 📦 Inventory Module

- **Visual Catalog:** large icons for fast use on touch screens.
- **Traffic Light System:** stock state at a glance — OK, low, or out.
- **Smart Ordering:** groups missing items into a message ready to send to a supplier.
- **Starter catalogue:** a venue that opens on Monday does not start with an empty screen. Coaster
  ships a catalogue in the repository and imports it in the establishment's language, as words —
  see [catalogue and menu](docs/architecture/catalogue-and-menu.md).
- **Allergens:** the fourteen Spanish law obliges a venue to declare, on the product itself.

### 📱 Public Menu

A menu customers read from a QR code, at `/m/:slug` — its own document, not a view over the
catalogue, with its own translations and its own prices. Publishing renders it once into a snapshot,
so the public page is one column read with no joins and nothing to invalidate. Off until somebody
turns it on, and never showing stock, takings or staff.

### 🤖 Assistant

An in-app assistant, by text or by voice, that reads the venue's live state and executes actions on
it. Every one of its tools dispatches the same command an HTTP route would and checks the same
permission first, so it can never do more than the caller can. See
[the assistant](docs/architecture/assistant.md).

### 🛡️ Admin Backoffice

Platform operations at `/admin`, for users with the `ADMIN` role: metrics, venue and user
management, granting PRO by hand without Stripe, the beta allowlist, and an audit log of every action
taken.

See [backoffice](docs/admin/backoffice.md).

### 🔔 Real-Time

Live updates over Server-Sent Events: orders, tables, stock, members and subscription changes
propagate to everyone watching the venue. One authenticated `GET` per client, the same guards as
every other endpoint. A reconnect replays a two-minute buffer, so nothing is missed across a tunnel
or a screen lock.

---

## 🧩 One Product, Three Modules

Not every venue sells at a till, and none of them should pay in screen space for what they do not
do. An establishment picks a business type at onboarding, and that turns on modules:

| Module          | Turns on                              | Hospitality | Retail | Other |
| --------------- | ------------------------------------- | :---------: | :----: | :---: |
| `TIME_TRACKING` | clocking and the legal register       |      ✓      |   ✓    |   ✓   |
| `ORDERS`        | tables, orders, payments, the printer |      ✓      |        |       |
| `INVENTORY`     | catalogue, stock, the public menu     |      ✓      |   ✓    |       |

It is enforced, not merely hidden: `EstablishmentModulesGuard` answers `403 MODULE_NOT_ENABLED` on
the API, `moduleGuard` blocks the route in the browser, and the assistant is not even offered the
tools. Changing it later is the owner's call, under **Settings**.

---

## 🔐 Access Model

Four independent axes, all of which a request must pass:

| Axis           | Values                                 |
| -------------- | -------------------------------------- |
| Platform role  | `USER`, `ADMIN`                        |
| Venue role     | `OWNER`, `MANAGER`, `STAFF`            |
| Subscription   | Stripe, manual grant, none             |
| Enabled module | `TIME_TRACKING`, `ORDERS`, `INVENTORY` |

An unpaid venue keeps **read** access to its history — it only loses writes. And it never loses the
working-time register: clocking in carries `@SkipSubscriptionCheck()`, because the legal obligation
does not depend on the invoice being paid. Full detail in
[Access model](docs/architecture/permissions.md).

---

## 🛠️ The Golden Stack (Architecture)

- **Monorepo Strategy:** npm workspaces — `apps/{api,web,printer-service,firebase}` and
  `packages/common`, which holds everything both sides must agree on (the permission table, the
  pricing engine, the error codes).
- **Backend:** NestJS 11 on Fastify, CQRS + Prisma 7 over PostgreSQL.
- **Frontend:** Angular 22 — standalone, signals, zoneless — with Material and Tailwind CSS v4.
- **Identity:** Firebase Auth. There is no `Account` table on purpose: `User.firebaseUid` is the
  Firebase UID, so adding a provider is a setting rather than a migration.
- **Realtime and cache:** Server-Sent Events over an optional Redis bus.
- **Billing:** Stripe Checkout, Customer Portal and webhooks.
- **Assistant:** the Vercel AI SDK against the AI Gateway, calling CQRS commands as tools.
- **Printer bridge:** a Go service polling a job queue from inside the venue.
- **Testing:** Vitest for unit tests, Vitest + testcontainers (a real Postgres, real migrations) for
  API e2e, Playwright for the browser, `go test` for the bridge.
- **Infrastructure:** Docker (local) · Vercel + Google Cloud Run + Neon (production).

Architecture notes live in [`docs/`](docs/README.md).

---

## 🚀 Getting Started & Running Tasks

The repository is an npm workspace containing the API, web application, shared TypeScript package,
Firebase emulator, and printer service.

### Run the Dev Servers

To run the frontend/backend servers for your app, use:

The simplest thing that works is to run all of it in containers:

```sh
docker compose up
```

That brings up Postgres, Redis, the Firebase emulator, the API on `:3000`, the web app on `:4200`
and the Stripe CLI forwarding webhooks. To run an application on the host instead, start the
infrastructure it needs and then the app:

```sh
# Start local infrastructure
docker compose up db redis firebase

# Run the Backend API
npm run dev:api

# Run the Frontend App
npm run dev:web
```

`redis` is optional. With `REDIS_URL` unset the application behaves exactly as it did before the
cache existed: every guard reads Postgres, the rate limit counts per process, and realtime events
reach only the clients of the instance that raised them — see
[the shared cache](docs/operations/redis.md). To reproduce the multi-instance behaviour locally,
`docker compose --profile cluster up` adds a second API on `:3001`.

> **Upgrading an existing checkout:** the `db` service moved from `postgres:16-alpine` to
> `postgres:18-alpine`. A `postgres_data` volume created by 16 will not start under 18, so drop it
> once (`docker compose down -v db`) and let the migrations rebuild your local database.

To exercise Stripe locally you also need its CLI forwarding events to the API. `docker compose up`
starts a `stripe` service that does it, or run it yourself — see
[Stripe setup](docs/saas/stripe-local-setup.md).

### When a change does not seem to apply

Six container traps, all of which look like broken code. Check
`docker compose logs web` first: a failed build leaves the browser on the last good bundle.

| Symptom                                                                                               | Cause                                                                                                                                                                                                           | Fix                                                                                                                                                                                                                                                                                                                         |
| ----------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| The UI ignores your change                                                                            | The `ng serve` watcher kept stale contents after a file was added or deleted                                                                                                                                    | `docker compose restart web`                                                                                                                                                                                                                                                                                                |
| `does not provide an export named '...'`                                                              | A stale pre-bundle of `@coaster/common`. Fixed at the root: `angular.json` now excludes it from the dev server's `prebundle`, so it is compiled with the app and picks changes up on the spot                   | If it ever returns, the cache is stale: `docker compose exec web rm -rf /app/apps/web/.angular/cache && docker compose restart web`. Delete it **from inside the container** — removing it from the host while the container holds it open detaches the bind mount, and everything you do afterwards on the host is ignored |
| Google sign-in opens and closes, and `window.__TEST_LOGIN__` is gone                                  | `src/environments/environment.ts` is generated by `set-env.ts`, and a `PRODUCTION=true` build leaves it that way. The dev server then runs against the real Firebase project with no emulator and no test hooks | `cd apps/web && node set-env.ts && docker compose restart web`. Any of `npm run dev`, `start` or `test` regenerates it too — it is only a production **build** that leaves it behind                                                                                                                                        |
| `Cannot find module '@nestjs/...'`                                                                    | `node_modules` are anonymous volumes, so a host install is invisible inside                                                                                                                                     | `docker compose exec api npm install`                                                                                                                                                                                                                                                                                       |
| The API container dies on `failed to load file`                                                       | Same watcher trap as the web one: swc keeps compiling paths that a rename or a delete moved out from under it                                                                                                   | `docker compose restart api`                                                                                                                                                                                                                                                                                                |
| Tests fail on `RangeError: Offset is outside the bounds of the DataView` inside `@prisma/param-graph` | The Prisma client was generated by the container, whose `node_modules` drifted from the host's, and the unit tests run on the **host**                                                                          | `cd apps/api && npx prisma generate` — `npm run db:generate` deliberately runs inside the container, for the container                                                                                                                                                                                                      |

Signing in stops working after the Firebase emulator restarts, because it keeps no accounts: the next
sign-in gets a new id, and `SyncUserHandler` refuses to move an email onto a different account. Clear
the stored id once so the next sign-in claims it again:

```sh
docker compose exec db psql -U admin -d coaster -c "UPDATE \"User\" SET \"firebaseUid\" = NULL WHERE email = 'you@example.com'"
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
- Lint (includes the layering rules on both sides): `npm run lint`
- Run API E2E Tests: `npm run test:e2e -w @coaster/api` — brings up a database with testcontainers
- Run Web E2E Tests: `cd apps/web && npx playwright test`
- Run Printer Tests: `cd apps/printer-service && go test ./...`
- Generate Prisma Client: `npm run db:generate` (in the container) or `cd apps/api && npx prisma generate` (on the host, which is where the unit tests run)
- Apply Migrations: `npm run db:migrate`

CI runs all of the above except the Playwright suite, which is currently commented out in
[`ci.yml`](.github/workflows/ci.yml).

### Deploying

The web app goes to Vercel, the API to Google Cloud Run, the database is Neon. There are two
environments: `main` is production, `dev` is beta on `beta.coaster.business` — see
[production and beta](docs/operations/environments.md) for what they share, what they must not, and
how to set one up.

Environment variables that are easy to get wrong:

| Variable                 | Where     | Why it matters                                                                                                                                                                                                       |
| ------------------------ | --------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `PRODUCTION`             | web build | The build refuses to run without it, so a production bundle can never be silently built as a development one                                                                                                         |
| `USE_EMULATORS`          | web build | Must be `false` in production; the build refuses the combination                                                                                                                                                     |
| `ALLOW_INDEXING`         | web build | `false` writes a `robots.txt` that disallows everything. Beta sets it; production must not                                                                                                                           |
| `CORS_ORIGINS`           | API       | Comma-separated allowlist of browser origins. **Fails closed in production**: unset means every cross-origin request is refused, so set it before the deploy that introduces it                                      |
| `TRUST_PROXY_HOPS`       | API       | Defaults to `1`, correct for Cloud Run. Too high and the rate limit counts a header the caller controls — see [backend](docs/architecture/backend.md)                                                                |
| `PUBLIC_URL`             | API       | Where printer bridges download updates from; `localhost` reaches no venue                                                                                                                                            |
| `FRONTEND_URL`           | API       | Stripe returns here after checkout, and the invitation email links here — wrong, and beta invites people into production                                                                                             |
| `STRIPE_WEBHOOK_SECRET`  | API       | Without it every webhook is rejected and subscriptions never activate                                                                                                                                                |
| `STRIPE_PRICE_PRO`       | API       | What new checkouts are sold at. Raising it means a **new** price and the old one moved to `STRIPE_PRICE_PRO_LEGACY`, or subscribers silently drop to FREE                                                            |
| `PRINTER_JWT_SECRET`     | API       | Signs the LAN printing token. Shared between environments, a beta pairing prints on a real venue's printer                                                                                                           |
| `MEDIA_BUCKET`           | API       | Signed upload URLs for product images                                                                                                                                                                                |
| `AI_GATEWAY_API_KEY`     | API       | The assistant. Read by the AI SDK, not by our code, so a missing key only shows up as a failed answer                                                                                                                |
| `RESEND_API_KEY`         | API       | Invitation emails. Beta needs its own, or its invites spend production's quota                                                                                                                                       |
| `REDIS_URL`              | API       | Optional, and **never shared between environments** — keys carry no environment. Unset, rooms and the rate limit stay per-instance and every guard reads Postgres — see [the shared cache](docs/operations/redis.md) |
| `BETA_ALLOWLIST_ENABLED` | API       | Closes sign-up to the `BetaTester` table. Default off; on with an empty list locks everybody out — see [closed beta](docs/saas/closed-beta.md)                                                                       |

Migrations are not run by the image. Apply them with `prisma migrate deploy` before or during the
release.

## 📚 Documentation

Everything is indexed in [`docs/`](docs/README.md).

- [Access model](docs/architecture/permissions.md) — roles, guards, enabled modules, plan grants
- [Backend architecture](docs/architecture/backend.md) · [Frontend architecture](docs/architecture/frontend.md)
- [Domain models](docs/architecture/domain-models.md)
- [Catalogue and menu](docs/architecture/catalogue-and-menu.md) — and the languages between them
- [The assistant](docs/architecture/assistant.md)
- [Printing bridge](docs/architecture/printing-bridge.md)
- [Fichit](docs/operations/fichit-integration.md) — the working-time register, kept in its own service
- [The shared cache](docs/operations/redis.md) — realtime bus, rate limit, guard preamble
- [Production and beta](docs/operations/environments.md)
- [Stripe integration](docs/saas/stripe-integration.md) · [Stripe setup](docs/saas/stripe-local-setup.md) · [Closed beta](docs/saas/closed-beta.md)
- [Admin backoffice](docs/admin/backoffice.md)
- [Roadmap](TODO.md) — what is next, what is parked, what is owed
