# Stripe integration

## Module layout

The integration lives in two modules with a single direction of dependency:
`bar-subscription` → `stripe`.

**`stripe/`** — infrastructure adapter. It knows nothing about bars.

- `StripeClient`: lazy SDK instance.
- `StripeApi`: the only place in the codebase that calls `stripe.*`. It normalises Stripe's errors
  (`resource_missing` → `null`, everything else → application `ErrorCodes`).
- `StripeWebhookGuard`: verifies the signature and attaches the event to the request.

**`bar-subscription/`** — the domain. It holds the business rules.

- `StripeWebhookController`: receives the already-verified event and routes it to the right command,
  awaiting it.
- Projection handlers that write the `BarSubscription` read model.
- Use cases (`CreateCheckoutSessionCommand`, `CreateCustomerPortalSessionCommand`) that apply the
  rules (existing subscription, pending cancellation, stale customer) and delegate to `StripeApi`.

Checkout and Portal sessions deliberately do **not** live in `stripe`: they need to read the bar's
local state, and moving them there would create a cycle between the two modules.

There is no dispatcher and no registered consumers between the controller and the handlers. That
layer existed and was removed — it only forwarded events to a single place.

## Base flow

1. The owner picks a plan in Coaster.
2. The API creates a Checkout Session in Stripe.
3. Stripe takes the payment.
4. Stripe calls the webhook.
5. The API updates `BarSubscription` and emits a domain event.

## API endpoints (v1)

- `POST /api/v1/bars/:barId/bar-subscription/checkout-session`
- `POST /api/v1/bars/:barId/bar-subscription/customer-portal-session`
- `GET  /api/v1/bars/:barId/bar-subscription`
- `POST /api/v1/stripe/webhook`

## Webhook security and idempotency

- Signature verified with `STRIPE_WEBHOOK_SECRET`.
- Raw body read for the cryptographic check (`fastify-raw-body`, scoped to the webhook route).
- Exempt from rate limiting: Stripe retries, and the signature is the real gate.

Idempotency is **by construction, not by ledger**. All four handlers set subscription state from the
event payload rather than accumulating, so receiving the same event twice lands on the same row:

| Event                    | What repeating it does                                   |
| ------------------------ | -------------------------------------------------------- |
| `checkout.session.completed` | upserts state, re-read live from Stripe              |
| `customer.subscription.*`    | upserts the snapshot                                 |
| `invoice.paid`               | only acts when status is `PAST_DUE`/`UNPAID`; second time it is a no-op |
| `invoice.payment_failed`     | writes `PAST_DUE`, the same value                    |

There used to be a `StripeWebhookEvent` table claiming events, tracking attempts and storing the
full payload. It was removed: it guarded against a duplicate delivery that costs nothing, while
Stripe already keeps every event and shows each delivery attempt in its dashboard. Removing it also
removed the retention problem that came with storing customer billing data indefinitely.

An event that cannot be mapped to a bar is **acknowledged, not rejected**. Any subscription on the
same Stripe account that is not a Coaster venue — created from the dashboard, from another product,
or by `stripe trigger` — would otherwise 500 and be retried by Stripe for days.

Delivery is **synchronous**: the webhook only answers 2xx once the projection has been applied. If a
handler fails, the API answers 5xx and Stripe retries. Neither a saga nor the event bus is used here,
precisely because neither of them waits for the handler.

## Out-of-order and duplicate subscriptions

Webhooks do not arrive in order. `HandleSubscriptionChangedHandler` reads the tracked subscription
back from Stripe before letting an event for a different subscription id overwrite state, and
ignores the event if the tracked one is still live.

`HandleCheckoutCompletedHandler` handles the case of a venue that somehow checks out twice: if the
bar already tracks a live subscription, the incoming duplicate is cancelled in Stripe and
`DuplicateSubscriptionDetectedEvent` is published.

It also reads the subscription back from Stripe rather than waiting for `customer.subscription.*`.
That event usually arrives, but "usually" here means a venue that paid and stays locked out until
somebody notices.

## Environment variables

- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `STRIPE_PRICE_PRO`
- `FRONTEND_URL`

## Handled events

- `checkout.session.completed`
- `customer.subscription.created` / `updated` / `deleted` / `paused` / `resumed`
- `invoice.paid`
- `invoice.payment_failed`

Anything else is logged at debug level and acknowledged.

`BarSubscription` is a local read model: customer, subscription, plan, status and periods are only
ever written from webhooks — never from a user action.
