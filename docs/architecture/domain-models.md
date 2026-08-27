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

**Coaster stores none of it.** There is no `TimeEntry` table, no hash chain and no append-only
trigger: the register lives in [Fichit](../operations/fichit-integration.md), which does this as its
whole product. Keeping two implementations of one legal obligation was the duplication that had to
go, and half an implementation left switched off is worse than none — it looks like it is keeping
something when it is not.

What Coaster keeps is the **link** and the **permissions**. `Establishment.fichitCompanyId` and
`EstablishmentMember.fichitEmployeeId` say which company and which employee this is over there;
`Shift.fichitShiftId` mirrors the rota so the contrast is drawn in one place. Who may clock and who
may correct is still Coaster's `EstablishmentRole`, because that is Coaster's model of the venue.

`Workday` still exists as a **shape the screens draw**, mapped from Fichit's report on the way
through. It is stored nowhere on either side.

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

## Invoicing

`Invoice` is the Veri*factu billing record: one table for the whole chain, cancellations included,
because they share a sequence, a lock and a verification function. `InvoiceTaxLine` is a table rather
than three columns on the invoice — most tickets carry one 10% line, but a closed bottle taken away
(21%) alongside what was consumed gives the same ticket two bases.

`OrderAuditLog` is the establishment-level counterpart of `AdminAuditLog`: who voided a line, applied
a discount or reprinted a ticket, and why.

The full design, and the eleven work packages it is split into, are in
[`VERIFACTU.md`](../../VERIFACTU.md).

### Where the tax rate lives

`Category.taxRate` carries the rate, in whole basis points, and its products inherit it.
`Product.taxRate` is **nullable**: null means "whatever my category says", and a value means this one
product is different. `resolveTaxRate(product, category)` is the only thing that decides.

That shape exists because Coaster is no longer only for bars. A shop that uses the clock-in register
and stock control without ever taking an order sets 21% once on its category rather than on every
product. An earlier attempt used named brackets (`HOSPITALITY`, `ALCOHOL`, …); it was withdrawn
because it wrote one sector's vocabulary into a shared domain, and because the rate is copied onto
the product row at import anyway, so editing the bracket table never reached venues that had already
imported.

Over the wire the two are told apart by name, so neither can be used by mistake: `Product.taxRate` is
the **effective** rate, always present, resolved by the API; `Product.ownTaxRate` is the override the
row actually stores, and it is what the edit form reads and writes.

### Prices are net, and the tax is added on top

**`Product.price` is the base**, without tax. The customer pays base + tax: a product at 2,00 € with
10% is charged at 2,20 €.

The screens show the customer-facing figure, because a price without its tax is not a price anyone
recognises. The till and the inventory list render `grossFromNet(price, taxRate)`, and the product
form shows the resulting final price live while you type the base and the rate.

The consequence worth knowing: **not every final price is reachable.** At 10%, a base of 0,94 € gives
1,03 € and 0,95 € gives 1,05 €, so 1,04 € cannot be expressed. That is inherent to quoting net, and
it is the trade for having the tax computed rather than buried inside the price.

### The breakdown is computed, never stored twice

`OrderPricingEngine` returns `netTotal`, a `taxBreakdown` of one line per rate, and `orderTotal`,
which is the gross the customer owes. `taxBaseTotal + taxAmountTotal === orderTotal` always holds.

Two rules keep the arithmetic honest:

- **Each rate is taxed once, on its summed base**, not line by line and then added up, so seven lines
  of 0,33 € at 21% give 0,49 € of tax rather than seven separate roundings of 0,07 €.
- **Discounts come off the net, and what is left is taxed.** An order-level discount is spread across
  rates in proportion to their weight, and the leftover cent goes to the heaviest rate, so the same
  order always produces the same breakdown whatever the item ordering.

The tip sits outside the base and outside the tax; it reaches `payableTotal` only.

## What an order line freezes

`OrderItem` snapshots what it was sold as, not just what it cost:

- `priceAtPurchase`
- `productNameAtPurchase` — renaming a product no longer rewrites history. A receipt reprinted after
  a rename shows the name it was actually sold under, the same way `TimeEntry` snapshots the worker.
- `taxRateAtPurchase` — a product moved to another bracket does not retroactively change the VAT on
  a ticket that has already been issued.

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
