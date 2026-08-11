# Coaster roadmap

What is left, in the order it should be built. Technical detail lives in [`docs/`](docs/README.md);
this file is only the running order.

## Before the next deploy

- **The print bridge reads a new environment variable.** `BAR_ID` is now `ESTABLISHMENT_ID`. Any
  bridge already installed needs its `.env` or service file edited by hand — self-updating is not
  enough.

## Next: keep the price safe at scale

A flat monthly fee has to cover what one establishment costs to run. Requests, storage and sockets
scale flat with size and are paid for out of the Google AI Pro subscription, so the instance staying
warm is not a concern. The assistant was the exception, and it is now bounded by a context budget in
`ai/domain/snapshot.ts` — a 1,500-product venue costs about the same per message as a small bar.

- **A monthly AI allowance per establishment**, lower during the 14-day trial, so the worst case is
  bounded by policy and not only by prompt size. The budget caps what one message costs; nothing yet
  caps how many messages a month someone sends.

## Intelligence layer

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
