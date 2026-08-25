# Coaster roadmap

What is left, in the order it should be built. What is **already built** is recorded in
[`docs/roadmap.md`](docs/roadmap.md); technical detail lives in [`docs/`](docs/README.md). This file
is only the running order.

## Next

### 1. Help with the translations

The editor already counts what is unwritten in each language. What is missing is the assistant
translating a menu in one pass — once per item rather than once per request, so a 50-item menu is
about one message of the monthly allowance. Reviewed before it saves.

The cheaper half of the same problem is still open too: `starter-catalogue.ts` carries every name in
every language, and importing it was meant to leave a draft menu already written in both.
`ImportStarterCatalogueHandler` writes categories and products and stops, so a venue that took the
standard catalogue still starts its menu empty. Free translations, sitting in a file nothing reads.

## Later

- **Table reservations.** The largest of the parked features and the only one that needs a design of
  its own before it can be estimated.
- **Per-establishment time zone.** `ESTABLISHMENT_TIME_ZONE` is a constant. `EstablishmentSettings`
  is where it belongs, but moving it rewrites every workday calculation and the inspection CSV, and
  it buys nothing while the product is Spanish.
- **Intelligence layer.** AI recommendations over accumulated history: best and worst performing
  products, price adjustments for stagnant stock, rota suggestions from historical load. Cloud Run
  stops the container when idle, so an in-process cron will never fire — this needs Cloud Scheduler
  hitting an endpoint, or work driven by traffic.
- **The assistant's allowance.** Both halves of the cap are in: a context budget bounds what one
  message costs (`ai/domain/snapshot.ts`) and a monthly allowance bounds how many arrive — 500 paid,
  100 on trial, both environment variables. The numbers came from measurement, not from a finding.
  Nothing to do until there is real usage: if nobody approaches 500, raise it; if many exhaust it,
  that is an argument for a price tier rather than a problem.

## Known debt

- **Sixteen command handlers still publish nothing** out of sixty-six — six in `printer`, three in
  `shift-exchanges`, and the rest one apiece in `catalogue`, `menu`, `establishments`,
  `establishment-subscription` and `auth`. Every command should end up emitting its event even where
  nothing listens. The three that blocked the cache are done: `update-user`,
  `update-establishment-settings` and `handle-checkout-completed`, the last of which was writing an
  activated subscription in silence and would have left a venue that had just paid looking unpaid for
  as long as the TTL. Not all sixteen are debt of the same weight — `execute-ai` and
  `create-checkout-session` have nothing anybody would subscribe to — but the printer and exchange
  ones are the reason the realtime stream says nothing when a ticket fails or a shift changes hands.
- **Renaming a product rewrites history.** `OrderItem` stores `priceAtPurchase` but never the name it
  was sold under, so a receipt reprinted after a rename shows a sale that never happened under that
  name. Every product is renameable now that names are words rather than keys. The fix is for the
  order line to snapshot the name the way `TimeEntry` snapshots the user.
- **Open CORS** (`origin: '*'`) on the API, pending a decision on the production domain. It now also
  governs the realtime stream, which the browser reaches with a preflighted `Authorization` header. Narrow it to an allowlist before onboarding real venues.
- **Destructive backoffice actions** were deliberately left out. If deleting establishments or users
  is added, it must require typing the name to confirm and must land in the audit log.
- **Five imperative GETs remain**, all in `data-access`, all through `routes`, none in a component.
  They answer a button press or an event rather than describing state, so `httpResource` does not
  fit: replicating a rota week, verifying the hash chain, exporting the inspection CSV, polling a
  print job, and refreshing one order after a realtime event.
- **Event bindings are not covered by the web tests.** Component specs assert rendered DOM and call
  methods directly; dispatched DOM events never reach Angular listeners in that setup, so keyboard
  and click wiring is only ever verified by hand.
- **Browser e2e run against mocked HTTP, and not in CI.** The Playwright suite stubs every API
  response, so nothing automated exercises browser → API → database end to end — and the step that
  would run it is commented out in `ci.yml`, so today it only runs when somebody runs it. Printer
  pairing is covered on the API side and in Go, but no test drives a real binary against a real
  server.
- **`member-roles.e2e-spec.ts` failed once** and has passed every run since. Its siblings had a real
  race — asserting on a membership the invite saga writes asynchronously — fixed with
  `E2eTestSetup.waitForMembers`. This one asserts no member counts, so if it returns it is something
  else.
- **The admin mobile test does not reproduce the bug it was written for.** It asserts each admin
  screen fits a phone viewport, which is worth having, but its fixtures do not trigger the overflow
  that prompted it. Both fixes were verified by hand instead.
