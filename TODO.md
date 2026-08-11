# Coaster roadmap

What is left, in the order it should be built. Technical detail lives in [`docs/`](docs/README.md);
this file is only the running order.

## Done

- **Phase 1 — time tracking.** The register required by art. 34.9, append-only and hash-chained, with
  the CSV export for inspections. See [time tracking](docs/operations/time-tracking.md).
- **Phase 2 — from bars to establishments.** `Bar` became `Establishment` everywhere including the
  database; `TIME_TRACKING`, `ORDERS` and `INVENTORY` are stored per establishment and enforced on
  both sides; a new establishment is asked what it is before it is handed a menu it will never use.
  See the [rename runbook](docs/operations/establishment-rename.md).

## Before the next deploy

- **The print bridge reads a new environment variable.** `BAR_ID` is now `ESTABLISHMENT_ID`. Any
  bridge already installed needs its `.env` or service file edited by hand — self-updating is not
  enough.
- **The API and the web have to ship together.** The route prefix moved from `/bars/:barId` to
  `/establishments/:establishmentId`.
- **Check the Stripe price matches the landing.** The page says 19.99 €/month; what is actually
  charged comes from `STRIPE_PRICE_PRO`, and nothing keeps the two in step.

## Next: keep the price safe at scale

One establishment paying a flat monthly fee has to cover what it costs to run. Almost everything
scales flat with size — requests, storage, sockets — with one exception.

- **The AI prompt carries the whole establishment.** Every message embeds every product, table,
  category and open order. A venue with a 500-line catalogue costs several times what a small bar
  costs, on every single message, and nothing caps it. Trimming that snapshot and leaning on the
  read tools the assistant already has is the single biggest lever, and it bites hardest exactly on
  the customers that worry us.
- **A monthly AI allowance per establishment**, lower during the 14-day trial, so the worst case is
  bounded and predictable rather than discovered on a bill.
- **Watch Cloud Run instance-time, not request count.** The printer bridge polls every 2 seconds
  around the clock and websockets hold connections open, so an active establishment keeps an
  instance warm permanently. Backing the bridge off when it has found nothing to print for a while
  costs nothing in practice.

## Phase 3: intelligence layer

AI recommendations over accumulated history: best and worst performing products, price adjustments
for stagnant stock, rota suggestions from historical load.

Cloud Run stops the container when idle, so an in-process cron will never fire. This needs Cloud
Scheduler hitting an endpoint, or work driven by traffic.

## Not scheduled

- Table reservations.
- Public menu for customers.
- **Per-establishment time zone.** `ESTABLISHMENT_TIME_ZONE` is a constant. `EstablishmentSettings`
  is where it belongs, but moving it rewrites every workday calculation and the inspection CSV, and
  it buys nothing while the product is Spanish.
- **Locking a product's name.** Renaming a product rewrites what every past order line appears to
  have sold: `OrderItem` stores `priceAtPurchase` but never the name it was bought under. Either the
  name freezes after the first sale, or the order line snapshots it the way `TimeEntry` snapshots
  the user.

## Known debt

- **Open CORS** (`origin: '*'`) on both the API and the websocket gateway, pending a decision on the
  production domain. Narrow it to an allowlist before onboarding real venues.
- **Destructive backoffice actions** were deliberately left out. If deleting establishments or users
  is added, it must require typing the name to confirm and must land in the audit log.
- **Event bindings are not covered by the web tests.** Component specs assert rendered DOM and call
  methods directly; dispatched DOM events never reach Angular listeners in that setup, so keyboard
  and click wiring is only ever verified by hand.
- **Browser e2e run against mocked HTTP.** The Playwright suite stubs every API response, so nothing
  automated exercises browser → API → database end to end.
- **`member-roles.e2e-spec.ts` failed once** and has passed every run since. Its siblings had a real
  race — asserting on a membership the invite saga writes asynchronously — now fixed with
  `E2eTestSetup.waitForMembers`. This one asserts no member counts, so if it returns it is something
  else.
- **The admin mobile test does not reproduce the bug it was written for.** It asserts each admin
  screen fits a phone viewport, which is worth having, but its fixtures do not trigger the overflow
  that prompted it. Both fixes were verified by hand instead.
