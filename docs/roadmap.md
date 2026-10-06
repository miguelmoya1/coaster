# Product roadmap

What has been built, and why it counts as done. What is **left** lives in [pending](todo.md), in the
order it should be built — keeping the two apart is what stops them drifting into
two different plans.

## Done

### SaaS infrastructure and monetisation

- Marketing landing at the root, application under `/establishments`.
- Stripe Checkout, Customer Portal and webhooks, with the Pro price tax-exclusive through Stripe Tax.
- Internal domain events published from webhook handlers, so side effects stay decoupled.
- The guard's subscription step: an unpaid venue loses writes but **keeps reads**, so it never loses
  access to its own history — and never loses the working-time register at all.

See [Stripe integration](saas/stripe-integration.md).

### Admin backoffice

- `/admin` panel with platform metrics, establishments, users and an audit log.
- Manual PRO grants without going through Stripe, with expiry and reason, in columns a webhook
  cannot clobber.
- Every admin action recorded through one event and one writer.
- Single permission table, now in the web's `establishment-members` models and compared by a test
  with the Go API's, with the OWNER / MANAGER / STAFF hierarchy covered by tests.

See [backoffice](admin/backoffice.md) and [access model](architecture/permissions.md).

### Time tracking and legal compliance

The working-time register required by art. 34.9 of the Spanish Workers' Statute:

- Append-only marks, enforced by database triggers rather than by convention.
- Corrections that never overwrite the original, carrying who, when, what and why.
- Per-establishment hash chain over every mark, verifiable from the app.
- Free date range for both the on-screen register and the CSV export for labour inspections.
- The rota contrasted against what was actually worked (no-show, off-rota, late, early, overtime).

See [time tracking](operations/time-tracking.md).

### One product, three modules

- `TIME_TRACKING`, `ORDERS` and `INVENTORY` on `EstablishmentSettings`, chosen once at onboarding
  from a business type and changed afterwards under Settings.
- Enforced on all three surfaces from the same array: `middleware.Modules` on the API,
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
- A stream that comes back renews an expired session itself and makes every screen it feeds load
  again, so a tablet nobody touches never falls behind, however long it was away.

See [the shared cache](operations/redis.md).

### The assistant

- Text and voice, over tools that call the same services the HTTP routes do and check the
  same permission first — it can never do more than the caller can.
- Bounded on both sides: a context budget per message, a monthly allowance per venue.

See [the assistant](architecture/assistant.md).

### Printing

- A Go bridge on the venue's network, polling outwards, so there is no port to open.
- Paired by downloading a binary named after a one-hour code; the key never crosses a keyboard.
- Checksum-verified self-update.

See [printing bridge](architecture/printing-bridge.md).

### Own accounts

Firebase is gone from the code since 9 September 2026; switching it off is in [pending](todo.md).

- Email and password (Argon2id), and Google as an identity linked to the same person, verified by
  ID token against Google's published keys. Accounts are matched by verified email, so the old
  Firebase users land on their own record without a data migration.
- A 15-minute access JWT as `Bearer`, and an opaque refresh token in an `httpOnly` cookie, rotated
  on every use, sliding to 30 days and hashed, with reuse detection per family.
- One `AuthToken` table for email verification, password reset and invitations, and four emails on
  one template. Where somebody is waiting for the email, a sending failure shows.
- Per-address lockout after ten failed logins in fifteen minutes (keyed by the sha256 of the
  address), Have I Been Pwned with k-anonymity that lets the password through if the service is
  down, and an `AuthEvent` log of every sign-in, failure and credential change.

### Two environments

- `main` is production, `dev` is beta on `beta.coaster.business`, from one workflow and one image.
- A closed beta gated by an allowlist that touches sign-up only, behind an environment variable that
  needs no rebuild.

See [production and beta](operations/environments.md) and [closed beta](saas/closed-beta.md).

### The API in Go

- The NestJS API rewritten in Go: the same 124 routes, permissions, error codes and bodies, hexagonal,
  with hand-written SQL over pgx. Beta runs it since 30 September 2026; production follows with the
  merge of `dev` into `main`, which is already prepared.
- The schema as its own application, `apps/database`: goose migrations applied by a Cloud Run job
  before each deploy, which took over the Prisma history on its first run.
- Its own e2e suite, the real binary against a real Postgres, gating the deploy.

See [API](apps/api/README.md), [migration](apps/api/migracion.md) and
[database](apps/database.md).
