# Product roadmap

What has been built, and why it counts as done. What is **left** lives in [`TODO.md`](../TODO.md) at
the root, in the order it should be built — keeping the two apart is what stops them drifting into
two different plans.

## Done

### SaaS infrastructure and monetisation

- Marketing landing at the root, application under `/establishments`.
- Stripe Checkout, Customer Portal and webhooks, with the Pro price tax-exclusive through Stripe Tax.
- Internal domain events published from webhook handlers, so side effects stay decoupled.
- `SubscriptionActiveGuard`: an unpaid venue loses writes but **keeps reads**, so it never loses
  access to its own history — and never loses the working-time register at all.

See [Stripe integration](saas/stripe-integration.md).

### Admin backoffice

- `/admin` panel with platform metrics, establishments, users and an audit log.
- Manual PRO grants without going through Stripe, with expiry and reason, in columns a webhook
  cannot clobber.
- Every admin action recorded through one event and one writer.
- Single permission table in `@coaster/common`, with the OWNER / MANAGER / STAFF hierarchy covered
  by tests.

See [backoffice](admin/backoffice.md) and [access model](architecture/permissions.md).

### Time tracking and legal compliance

The working-time register required by art. 34.9 of the Spanish Workers' Statute:

- Append-only marks, enforced by database triggers rather than by convention.
- Corrections that never overwrite the original, carrying who, when, what and why.
- Per-establishment hash chain over every mark, verifiable from the app.
- Free date range for both the on-screen register and the CSV export for labour inspections.
- The rota contrasted against what was actually worked (no-show, off-rota, late, early, overtime).

Kept by [Fichit](operations/fichit-integration.md), which does this as its whole product. Coaster
owns the permissions; Fichit owns the register.

### One product, three modules

- `TIME_TRACKING`, `ORDERS` and `INVENTORY` on `EstablishmentSettings`, chosen once at onboarding
  from a business type and changed afterwards under Settings.
- Enforced on all three surfaces from the same array: `EstablishmentModulesGuard` on the API,
  `moduleGuard` on the routes, and the assistant's tool list.

### The catalogue and the menu

- The starter catalogue is a **file in the repository**, imported in the establishment's language as
  words. The two template tables, the API module and the admin editor that maintained 83 rows of
  content are gone.
- `Menu` / `MenuSection` / `MenuItem` with JSON translations, a draft read and replaced whole, and a
  publish that renders every language into one snapshot column.
- The public page at `/m/:slug`, outside every guard, with its own rate limit and no draft leaking.
- Allergens on the product, which is where the fact belongs.

See [catalogue and menu](architecture/catalogue-and-menu.md).

### Realtime

- Server-Sent Events: one authenticated `GET` per client, behind the same guards as every other
  endpoint, carrying orders, tables, stock, members and subscription changes.
- Shared across instances through Redis when `REDIS_URL` is set, and degrading to local-only —
  never to an outage — when it is not.
- A two-minute replay buffer, so a reconnect does not lose what happened while the tunnel was down.

See [the shared cache](operations/redis.md).

### The assistant

- Text and voice, over tools that dispatch the same CQRS commands the HTTP routes do and check the
  same permission first — it can never do more than the caller can.
- Bounded on both sides: a context budget per message, a monthly allowance per venue.

See [the assistant](architecture/assistant.md).

### Printing

- A Go bridge on the venue's network, polling outwards, so there is no port to open.
- Paired by downloading a binary named after a one-hour code; the key never crosses a keyboard.
- Checksum-verified self-update.

See [printing bridge](architecture/printing-bridge.md).

### Two environments

- `main` is production, `dev` is beta on `beta.coaster.business`, from one workflow and one image.
- A closed beta gated by an allowlist that touches sign-up only, behind an environment variable that
  needs no rebuild.

See [production and beta](operations/environments.md) and [closed beta](saas/closed-beta.md).
