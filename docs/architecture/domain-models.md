# Domain models

## What lives in `@coaster/common`

Anything the API and the front end need to agree on lives in the shared package, never duplicated on
both sides:

- Domain interfaces and DTOs.
- Enums and constants (`BarRole`, `Role`, `SubscriptionPlan`, `ErrorCodes`, ...).
- `domain/permissions` — the permission table and `hasPermission`.
- `domain/pricing` — the order pricing engine.
- `utils/brands` — branded-type constructors (`asBarId`, `asBarRole`, ...).
- `utils/stock` — stock status calculation.

Rule: if the logic is identical on both sides, it goes here. Each `core` only keeps what belongs to
its own environment (Prisma and Nest guards in the API; interceptors and session services in the
web app).

`ErrorCodes` deserves a note: every value must have a translation in both `es.json` and `en.json`,
and a test fails the build if one is missing. Adding an error code without a message would surface
the raw key to a user.

## Contexts

Bars and memberships · menu (categories and products) · tables and orders · shifts and exchanges ·
time tracking · printing · billing (Stripe and manual grants) · platform administration.

## Orders and pricing

`OrderPricingEngine` in `@coaster/common` is the single calculator. It takes items, adjustments, the
tip and what has been paid, and returns the line totals, the order total and what is still pending.
Both sides use it, so a discount never renders differently from how it is charged.

Money is **always integer cents**. Only the AI assistant converts to euros, at its boundary, because
it speaks to people.

Rules worth knowing:

- Item discounts are clamped to the line total, and order discounts to the post-item-discount
  subtotal, so a total can never go negative.
- Percentage adjustments are capped at 100 by DTO validation.
- Adjustments and tips are refused once an order is `CLOSED`. Allowing them would rewrite historical
  takings without recalculating what was actually collected.
- Checkout accepts `CASH` or `CARD` only. `MIXED` and `NONE` are states an order arrives at from
  per-item payments, not choices at the till.

Concurrency is handled in the write repository, not by hope: checkout claims the order with a
conditional `UPDATE ... WHERE status = 'OPEN'`, and partial payments take a row lock, so two people
closing the same order end with one success and one rejection rather than double-counted cash.

Merging orders carries the source orders' payments, tips and discounts onto the survivor. Order-level
percentage discounts are frozen into their cash value at merge time — otherwise a 10% discount from
a small tab would silently start applying to the combined bill. The surviving order is the oldest,
so the result does not depend on row ordering.

## Shifts and exchanges

- ShiftExchange
  - status: PENDING | APPROVED | REJECTED
  - requesterId (always the shift's owner) and targetId (optional when offering; filled in with
    whoever takes it)

  A shift can be exchanged **several times over its life**, but can only have one live offer at a
  time. That rule is held by a partial unique index (`ShiftExchange_shiftId_pending_key`, on
  `shiftId` where `status = 'PENDING'`), not by the application: the unique index used to be on
  `shiftId` alone, so a second exchange of the same shift failed with a driver error.

  Accepting claims the offer and transfers the shift in the same transaction, and only if it was
  still pending when the write landed. If two people accept at once, one gets the shift and the
  other gets `INVALID_EXCHANGE`.

  Rules that close the loop:

  - **A shift that has already started is not transferred** (`EXCHANGE_SHIFT_ALREADY_STARTED`):
    those hours are being worked. The UI does not offer the accept button either.
  - **A closed exchange is not deleted** (`EXCHANGE_ALREADY_CLOSED`), not even by the owner:
    deleting it undid nothing and lost the trace of who took the shift. Live offers can be withdrawn
    by their author, and any of them by the owner.
  - The offer list starts at **the bar's local day** (`BAR_TIME_ZONE`), not the UTC day: an
    early-hours shift used to disappear on the very day it happened.

Creating a shift requires the assignee to be an active member of that bar, and the end to be after
the start. Without the membership check any platform user id was accepted, which put a stranger's
name and photo into another venue's rota.

## Time tracking

`TimeEntry` is append-only and hash-chained per bar. It has its own document —
[time tracking](../operations/time-tracking.md) — because it is the one context with a legal
obligation attached.

`Workday` is not stored; it is derived per user and day from the marks, and carries the contrast
against the rota: planned minutes and window, plus discrepancies (`NO_SHOW`, `UNPLANNED`,
`LATE_START`, `EARLY_FINISH`, `OVERTIME`). Days seeded from the rota appear even with no marks at
all — otherwise an absence, which is exactly what you want to see, would be invisible.

## Billing

- BarSubscription
  - plan: FREE | PRO
  - status: INACTIVE | TRIALING | ACTIVE | PAST_DUE | CANCELED | UNPAID | EXPIRED
  - stripeCustomerId / stripeSubscriptionId
  - period windows and cancellation state
  - **manual grant**: manualPlan, manualGrantExpiresAt, manualGrantReason, manualGrantedById and
    manualGrantedAt

  The grant columns live apart from the Stripe ones on purpose: a webhook can update billing without
  clobbering what an admin granted, and paid access is always distinguishable from gifted access.
  Detail in [access model](permissions.md).

There is no local copy of Stripe events. See [Stripe integration](../saas/stripe-integration.md) for
why idempotency does not need one here.

## Administration

- AdminAuditLog
  - actor (`User`), action, target type and id, human-readable label
  - optional reason and a JSON `metadata` with before and after
  - indexed by date and by target

## Billing domain events

- SubscriptionRenewedEvent
- SubscriptionCancelledEvent
- SubscriptionPaymentFailedEvent
- SubscriptionOverriddenEvent — an admin granted or revoked a plan by hand

The first three are emitted while processing webhooks; the fourth from the backoffice. All of them
end at the same websocket handler, which tells the bar's clients with `subscriptionUpdated`.

## Member domain events

- MemberInvitedEvent
- MemberRemovedEvent — also evicts that user from the bar's websocket room
- MemberRoleChangedEvent — goes out over the socket as `memberRoleChanged`, so the team list and the
  affected person's own permissions refresh without a reload

## Indexing

PostgreSQL does not index foreign keys on its own and Prisma does not add them. Every hot filter has
an explicit index: `Order(barId, status)` and `Order(barId, createdAt)`, `OrderItem(orderId)`,
`OrderAdjustment(orderId)`, `Shift(barId, startTime)`, `Category(barId, deletedAt)`,
`Product(categoryId, deletedAt)`, `BarMember(barId, deletedAt)`. Without them the orders screen was
a sequential scan of the whole table.
