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

### 📅 HR Module (The Roster)

- **Multi-view Calendar:** daily, weekly and monthly shift views.
- **Shift Assignment:** owners and managers create shifts and assign them to staff.
- **Shift Marketplace:** staff can drop a shift for someone else to pick up.
- **Staff Management:** three roles per venue — `OWNER`, `MANAGER` and `STAFF`.

### 📦 Logistics & Inventory Module (The Pantry)

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

| Axis             | Values                      |
| ---------------- | --------------------------- |
| Platform role    | `USER`, `ADMIN`             |
| Venue role       | `OWNER`, `MANAGER`, `STAFF` |
| Subscription     | Stripe, manual grant, none  |

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

> **Deleting a file breaks the web watcher.** The containerised `ng serve` keeps stale contents in
> memory and every rebuild fails afterwards. Run `docker compose restart web`.

To exercise Stripe locally you also need its CLI forwarding events to the API. `docker compose up`
starts a `stripe` service that does it, or run it yourself — see
[Stripe integration](docs/saas/stripe-integration.md).

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

## 📚 Documentation

- [Access model](docs/architecture/permissions.md) — roles, guards and plan grants
- [Backend architecture](docs/architecture/backend.md)
- [Frontend architecture](docs/architecture/frontend.md)
- [Admin backoffice](docs/admin/backoffice.md)
- [Roadmap](docs/roadmap.md)
