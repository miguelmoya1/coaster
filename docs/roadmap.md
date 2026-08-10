# Product roadmap

## Done

### SaaS infrastructure and monetisation

- Marketing landing at the root, application under `/establishments`.
- Stripe Checkout, Customer Portal and webhooks.
- Internal domain events published from webhook handlers, so side effects stay decoupled.
- `SubscriptionActiveGuard`: an unpaid venue loses writes but **keeps reads**, so it never loses
  access to its own history.

### Admin backoffice

- `/admin` panel with platform metrics, bars, users and an audit log.
- Manual PRO grants without going through Stripe, with expiry and reason.
- Every admin action recorded.
- Single permission table in `@coaster/common`, with the OWNER / MANAGER / STAFF hierarchy covered
  by tests.

See [backoffice](admin/backoffice.md) and [access model](architecture/permissions.md).

### Time tracking and legal compliance

The working-time register required by art. 34.9 of the Spanish Workers' Statute:

- Append-only marks, enforced by database triggers rather than by convention.
- Corrections that never overwrite the original, carrying who, when, what and why.
- Per-bar hash chain over every mark.
- Free date range for both the on-screen register and the CSV export for labour inspections.
- The rota contrasted against what was actually worked (no-show, off-rota, late, early, overtime).

See [time tracking](operations/time-tracking.md).

## Next

### Intelligence layer

- Sales, inventory and staffing recommendations over accumulated history.
- Asynchronous processing on a schedule. Cloud Run stops idle containers, so this needs an external
  trigger rather than an in-process cron.

## Not scheduled

- Table reservations.
- Public menu customers can browse.
