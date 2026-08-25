# Domain models

## What lives in `@coaster/common`

Anything the API and the front end need to agree on lives in the shared package, never duplicated on
both sides:

- Domain interfaces and DTOs.
- Enums and constants (`EstablishmentRole`, `Role`, `SubscriptionPlan`, `ErrorCodes`, ...).
- `domain/permissions` — the permission table and `hasPermission`.
- `domain/pricing` — the order pricing engine.
- `utils/brands` — branded-type constructors (`asEstablishmentId`, `asEstablishmentRole`, ...).
- `utils/stock` — stock status calculation.

Rule: if the logic is identical on both sides, it goes here. Each `core` only keeps what belongs to
its own environment (Prisma and Nest guards in the API; interceptors and session services in the
web app).

`ErrorCodes` deserves a note: every value must have a translation in both `es.json` and `en.json`,
and a test fails the build if one is missing. Adding an error code without a message would surface
the raw key to a user.

## Contexts

Establishments, their settings and memberships · the catalogue (categories and products) · the
published menu · tables and orders · shifts and exchanges · time tracking · printing · media
uploads · takings and statistics · the AI assistant · billing (Stripe and manual grants) · platform
administration.

## The establishment and its settings

- Establishment — a name, and everything else hangs off it.
- EstablishmentSettings — one row per establishment, created with it:
  - `modules`: which of `TIME_TRACKING`, `ORDERS`, `INVENTORY` the venue runs. Enforced by
    `EstablishmentModulesGuard` — see [access model](permissions.md).
  - `language`: the establishment's own language, inherited from its creator. It decides what the
    starter catalogue is imported as and what a draft menu's default language is. It is **not** the
    language of the interface, which is `UserPreferences.language`, per person.
  - `markSoldOut`: whether a product at zero stock is shown as sold out on the order screen.
  - `configuredAt`: null until onboarding has been through. It is what makes the business-type
    dialog appear exactly once.

`EstablishmentMember` carries `hourlyRateCents`, which is what the labour-cost figure
(`establishment:view-labor-cost`) is computed from, and `deletedAt`, because removing a member is a
soft delete — the guards, the AI handler and the members list all filter on it.

## Accounts

There is **no `Account` table, on purpose**. `User.firebaseUid` is the Firebase UID, and Firebase is
the account layer: adding a sign-in provider is a Firebase setting, not a migration. `User` rows can
exist before their owner has ever signed in — that is how an invitation works — and the claim rules
are in [access model](permissions.md).

`UserPreferences` holds the interface language, one row per user.

`BetaTester` is an allowlist of email addresses that may open a **new** account while the beta is
closed. It gates sign-up only, and only when `BETA_ALLOWLIST_ENABLED` is on. See
[closed beta](../saas/closed-beta.md).

## The catalogue and the menu

Two different documents, deliberately — the catalogue is operational and private, the menu is
published. `Category` and `Product` are the catalogue; `Menu`, `MenuSection` and `MenuItem` are the
menu, with their text in JSON `translations` columns and a whole rendered `publishedSnapshot` the
public page reads. `Product.allergens` carries the fourteen the Spanish rules list. The reasoning and
the shape are in [catalogue and menu](catalogue-and-menu.md).

Both `Category` and `Product` are soft-deleted (`deletedAt`), because an order line points at a
product and history must survive the product being retired.

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
  - The offer list starts at **the establishment's local day** (`ESTABLISHMENT_TIME_ZONE`), not the UTC day: an
    early-hours shift used to disappear on the very day it happened.

Creating a shift requires the assignee to be an active member of that establishment, and the end to be after
the start. Without the membership check any platform user id was accepted, which put a stranger's
name and photo into another venue's rota.

## Time tracking

`TimeEntry` is append-only and hash-chained per establishment. It has its own document —
[time tracking](../operations/time-tracking.md) — because it is the one context with a legal
obligation attached.

`Workday` is not stored; it is derived per user and day from the marks, and carries the contrast
against the rota: planned minutes and window, plus discrepancies (`NO_SHOW`, `UNPLANNED`,
`LATE_START`, `EARLY_FINISH`, `OVERTIME`). Days seeded from the rota appear even with no marks at
all — otherwise an absence, which is exactly what you want to see, would be invisible.

## Billing

- EstablishmentSubscription
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

## Printing

- PrinterConfig — one per establishment: the `deviceKey` a bridge authenticates with, plus the
  address and port it last reported.
- PrinterPairing — a short-lived, single-use code that a bridge exchanges for the device key on
  first run, so nobody has to copy a UUID onto a computer at the venue.
- PrintJob — the queue: payload, status, attempts and the last error.

See [printing bridge](printing-bridge.md).

## The assistant

- AiUsage — one row per establishment per calendar month (`period` is `YYYY-MM`), holding the count
  of messages. It is the monthly allowance; it stores no conversation and no prompt.

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
end at the same realtime handler, which tells the establishment's clients with `subscriptionUpdated`.

## Member domain events

- MemberInvitedEvent
- MemberRemovedEvent — also closes that user's stream for the establishment
- MemberRoleChangedEvent — goes out over the stream as `memberRoleChanged`, so the team list and the
  affected person's own permissions refresh without a reload

## Indexing

PostgreSQL does not index foreign keys on its own and Prisma does not add them. Every hot filter has
an explicit index: `Order(establishmentId, status)`, `Order(establishmentId, createdAt)` and
`Order(establishmentId, createdById, createdAt)` for one waiter's own takings, `OrderItem(orderId)`,
`OrderAdjustment(orderId)`, `Shift(establishmentId, startTime)` and `Shift(userId, startTime)`,
`Category(establishmentId, deletedAt)`, `Product(categoryId, deletedAt)`,
`EstablishmentMember(establishmentId, deletedAt)`, `PrintJob(establishmentId, status, createdAt)` for
the bridge's long-poll, and on `TimeEntry` both `(establishmentId, userId, workdayDate)` and
`(establishmentId, workdayDate)`. Without them the orders screen was a sequential scan of the whole
table.
