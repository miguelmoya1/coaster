# Coaster roadmap

What is left, in the order it should be built. Technical detail lives in [`docs/`](docs/README.md);
this file is only the running order.

## Before the next deploy

- **Publish the bridge binaries.** `GET /printer/download` streams whatever sits in
  `public/downloads` under a name carrying a pairing code. With nothing published, the download
  button in Settings hands back nothing.
- **The API and the web ship together.** The route prefix moved from `/bars/:barId` to
  `/establishments/:establishmentId`.
- **Check the Stripe price matches the landing.** The page says 19.99 €/month; what is actually
  charged comes from `STRIPE_PRICE_PRO`, and nothing keeps the two in step.
- **Bridges installed before all this** still look for `BAR_ID`. Rather than editing a file on
  someone's machine, download it again from Settings — it pairs itself.

## Next

### Watch what the assistant actually costs

Both halves of the cap are in: a context budget bounds what one message costs
(`ai/domain/snapshot.ts`), and a monthly allowance bounds how many arrive — 500 paid, 100 on trial,
both environment variables. The numbers came from measurement, not from a finding. Worth revisiting
once there is real usage: if nobody approaches 500, raise it; if many exhaust it, that is a reason
for a price tier rather than a problem.

### Intelligence layer

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
- **Five imperative GETs remain**, all in `data-access`, all through `routes`, none in a component.
  They answer a button press or an event rather than describing state, so `httpResource` does not
  fit: replicating a rota week, verifying the hash chain, exporting the inspection CSV, polling a
  print job, and refreshing one order after a socket event.
- **Event bindings are not covered by the web tests.** Component specs assert rendered DOM and call
  methods directly; dispatched DOM events never reach Angular listeners in that setup, so keyboard
  and click wiring is only ever verified by hand.
- **Browser e2e run against mocked HTTP.** The Playwright suite stubs every API response, so nothing
  automated exercises browser → API → database end to end. Printer pairing is covered on the API
  side and in Go, but no test drives a real binary against a real server.
- **`member-roles.e2e-spec.ts` failed once** and has passed every run since. Its siblings had a real
  race — asserting on a membership the invite saga writes asynchronously — fixed with
  `E2eTestSetup.waitForMembers`. This one asserts no member counts, so if it returns it is something
  else.
- **The admin mobile test does not reproduce the bug it was written for.** It asserts each admin
  screen fits a phone viewport, which is worth having, but its fixtures do not trigger the overflow
  that prompted it. Both fixes were verified by hand instead.
