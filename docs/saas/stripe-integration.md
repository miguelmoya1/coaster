# Stripe integration

## Module layout

The integration lives in two modules with a single direction of dependency:
`establishment-subscription` → `stripe`.

**`stripe/`** — infrastructure adapter. It knows nothing about establishments.

- `StripeClient`: lazy SDK instance.
- `StripeApi`: the only place in the codebase that calls `stripe.*`. It normalises Stripe's errors
  (`resource_missing` → `null`, everything else → application `ErrorCodes`).
- `StripeWebhookGuard`: verifies the signature and attaches the event to the request.

**`establishment-subscription/`** — the domain. It holds the business rules.

- `StripeWebhookController`: receives the already-verified event and routes it to the right command,
  awaiting it.
- Projection handlers that write the `EstablishmentSubscription` read model.
- Use cases (`CreateCheckoutSessionCommand`, `CreateCustomerPortalSessionCommand`) that apply the
  rules (existing subscription, pending cancellation, stale customer) and delegate to `StripeApi`.

Checkout and Portal sessions deliberately do **not** live in `stripe`: they need to read the establishment's
local state, and moving them there would create a cycle between the two modules.

There is no dispatcher and no registered consumers between the controller and the handlers. That
layer existed and was removed — it only forwarded events to a single place.

## Base flow

1. The owner picks a plan in Coaster.
2. The API creates a Checkout Session in Stripe.
3. Stripe takes the payment.
4. Stripe calls the webhook.
5. The API updates `EstablishmentSubscription` and emits a domain event.

## API endpoints (v1)

- `POST /api/v1/establishments/:establishmentId/establishment-subscription/checkout-session`
- `POST /api/v1/establishments/:establishmentId/establishment-subscription/customer-portal-session`
- `GET  /api/v1/establishments/:establishmentId/establishment-subscription`
- `GET  /api/v1/establishments/:establishmentId/establishment-subscription/seats`
- `POST /api/v1/stripe/webhook`

## Webhook security and idempotency

- Signature verified with `STRIPE_WEBHOOK_SECRET`.
- Raw body read for the cryptographic check (`fastify-raw-body`, scoped to the webhook route).
- Exempt from rate limiting: Stripe retries, and the signature is the real gate.

Idempotency is **by construction, not by ledger**. All four handlers set subscription state from the
event payload rather than accumulating, so receiving the same event twice lands on the same row:

| Event                        | What repeating it does                                                  |
| ---------------------------- | ----------------------------------------------------------------------- |
| `checkout.session.completed` | upserts state, re-read live from Stripe                                 |
| `customer.subscription.*`    | upserts the snapshot                                                    |
| `invoice.paid`               | only acts when status is `PAST_DUE`/`UNPAID`; second time it is a no-op |
| `invoice.payment_failed`     | writes `PAST_DUE`, the same value                                       |

There used to be a `StripeWebhookEvent` table claiming events, tracking attempts and storing the
full payload. It was removed: it guarded against a duplicate delivery that costs nothing, while
Stripe already keeps every event and shows each delivery attempt in its dashboard. Removing it also
removed the retention problem that came with storing customer billing data indefinitely.

An event that cannot be mapped to an establishment is **acknowledged, not rejected**. Any subscription on the
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
establishment already tracks a live subscription, the incoming duplicate is cancelled in Stripe and
`DuplicateSubscriptionDetectedEvent` is published.

It also reads the subscription back from Stripe rather than waiting for `customer.subscription.*`.
That event usually arrives, but "usually" here means a venue that paid and stays locked out until
somebody notices.

## Environment variables

- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `STRIPE_PRICE_PRO` — the price new checkouts are sold at, and **the only price seats are ever pushed to**
- `STRIPE_PRICE_PRO_LEGACY` — optional, comma separated: prices sold before it that still count as Pro
- `PRO_BASE_PRICE_CENTS` — the flat tier, for display only (default 1999)
- `PRO_INCLUDED_SEATS` — how many staff the flat fee covers, for display only (default 10)
- `PRO_EXTRA_SEAT_PRICE_CENTS` — what one seat beyond that costs, for display only (default 200)
- `FRONTEND_URL`

## Seats

The Pro price is **graduated**: one tier with a `flat_amount` covering the first `PRO_INCLUDED_SEATS`
staff, and a second tier charging `unit_amount` for each one beyond. The subscription item's
`quantity` is the number of active members of the venue, and Stripe does the arithmetic — there is
no second line item and no per-seat price of our own.

That means **`quantity` means something different on the current price than on any older one**. A
legacy Pro price is flat and licensed: a quantity of 12 there charges twelve times the monthly fee.
`StripeApi.updateSubscriptionSeats` therefore looks the item up by price id and refuses to touch a
subscription that has no item on `STRIPE_PRICE_PRO`. Never widen that: seats are only ever pushed to
the price they are billed at.

The count is `EstablishmentMember` rows that are `active` and not soft-deleted, owner included, with
a floor of one. `SyncSubscriptionSeatsHandler` compares it against the `seats` column — the last
quantity Stripe reported — and only calls Stripe when they differ. It runs on `MemberInvitedEvent`
and `MemberRemovedEvent`, and the `seats` column itself is written from the webhook like every other
column of that table.

Changes are `create_prorations`: adding a seat mid-period does not charge anything now, it lands
prorated on the next invoice. That is what the invite dialog tells the owner before they confirm.
Nothing is ever blocked for being over the allowance.

If the Stripe call fails, the handler logs an error and gives up rather than failing the invitation —
the member already exists. Nothing retries it, so the venue keeps being billed the old number of
seats until the next staff change, and that log line is the only notice. `PRO_INCLUDED_SEATS` and
`PRO_EXTRA_SEAT_PRICE_CENTS` mirror the Stripe tiers for the copy shown to the owner; the money
itself comes from the tiers, so drift there is a wrong label, never a wrong charge.

A venue still on a legacy flat price is shown the allowance too, which is meaningless for it. That
is left alone deliberately: the legacy set is closed, and it is a label, not a charge.

## Where the price is written down for a human to read

The tiers in Stripe are what charges. Three surfaces repeat them, and they are the places to change
when the price moves:

| Surface | Where the numbers come from |
| :--- | :--- |
| The plan dialog and the staff list, inside the app | `GET …/establishment-subscription/seats`, i.e. the three `PRO_*` variables |
| The invite dialog's warning | the same endpoint |
| The public landing at `/` | hardcoded — `BASE_PRICE_CENTS` and friends in `landing.ts`, plus `landing.pricing.*` in the i18n files |

The landing is static because it is served to people who have no establishment and no token, so
there is nothing to ask the API about. It is the one that goes stale silently, and the one a
customer reads before deciding, so change it first. `landing.spec.ts` pins the four amounts in its
table against the arithmetic, which catches a table edited by hand but not a price changed in
Stripe alone.

## When the projection and Stripe disagree

`EstablishmentSubscription` is a copy of what Stripe told us. A webhook that never arrives leaves
that copy behind, and a copy that says "lapsed" locks a venue that is paying — the worst failure
this system has, because the customer paid and cannot work.

So `SubscriptionActiveGuard` does not take the copy as final. When it is about to answer 402 and the
row still carries a `stripeSubscriptionId`, it asks Stripe through `SUBSCRIPTION_REFRESHER`, writes
what comes back and decides again. An establishment that never subscribed has no id, so it never
costs a Stripe call, and the check only runs on the path that was going to fail anyway.

The refresher lives in `establishment-subscription`, not in `core`: the guard is base layer and may
not import a feature module. `core` declares the token, the feature module provides it, and the
guard resolves it through `ModuleRef` with `strict: false`. With nothing registered the guard simply
behaves as it did before any of this existed.

That refresh is the one write to `EstablishmentSubscription` that does not come from a webhook. It
is still Stripe's own answer being written — the same source, asked directly instead of waited for.

## A failed card does not lock the venue

Stripe retries a failed payment for about two weeks before giving up. Cutting a bar's till off on
day one over an expired card does far more damage than the fee is worth, and the venue churns.

`PAST_DUE` therefore keeps full access, on both sides: the guard grants it and the web mirrors it in
`isReadOnly`. What the owner gets is `paymentNeedsAttention` — a banner that says the charge failed
and sends them to the portal to fix the card. Access is only cut when Stripe itself gives up and the
subscription becomes `UNPAID`, or it is cancelled with no paid period left.

Both sides must agree. If the web ever stops mirroring the guard, the venue is shown a workspace it
cannot write to, which is worse than either answer on its own.

## Tax

The Pro price is **tax exclusive**: Checkout runs with `automatic_tax`, asks for a billing address
and offers a tax id field, and Stripe adds the VAT of the customer's country on top of the tiered
total — the 19,99 € flat tier plus whatever the seats beyond the allowance come to.
Stripe Tax has to be active and registered in the dashboard — separately in test and in live mode —
or `checkout.sessions.create` fails outright.

Raising the price means creating a new one in Stripe, never editing the old: a price is immutable
once a subscription points at it. Move `STRIPE_PRICE_PRO` to the new id and push the old one into
`STRIPE_PRICE_PRO_LEGACY`, or every subscriber still on it is projected as `FREE` the next time a
webhook mentions their subscription, and loses Pro without anybody touching their account.

Changing the allowance or what an extra seat costs is the same operation — the tiers live on the
price and a price is immutable — so move `PRO_INCLUDED_SEATS` and `PRO_EXTRA_SEAT_PRICE_CENTS` in
the same breath as `STRIPE_PRICE_PRO`. Subscribers on the old price keep the tiers they bought.

## Handled events

- `checkout.session.completed`
- `customer.subscription.created` / `updated` / `deleted` / `paused` / `resumed`
- `invoice.paid`
- `invoice.payment_failed`

Anything else is logged at debug level and acknowledged.

`EstablishmentSubscription` is a local read model: customer, subscription, plan, status and periods are
written from Stripe and never from a user action — normally by a webhook, and by the guard's refresh
when the copy has fallen behind (see [When the projection and Stripe disagree](#when-the-projection-and-stripe-disagree)).
