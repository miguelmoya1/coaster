# Coaster roadmap

What is left, in the order it should be built. Technical detail lives in [`docs/`](docs/README.md);
this file is only the running order.

## Next

### 1. Freeze what a product was sold as

Renaming a product today rewrites what every past order appears to have sold: `OrderItem` stores
`priceAtPurchase` but never the name it was bought under. Either the name locks after the first sale,
or the order line snapshots it the way `TimeEntry` snapshots the user. The snapshot is the better of
the two — it keeps the catalogue editable and it makes a receipt reprinted a year later still true.
Small, and the only item here that is fixing something rather than adding to it.

### 2. Redis as a read cache

Reads and writes are already separate, so the cache has an obvious seam: queries read through it,
commands never touch it, and the events those commands publish are what expires it.

- **The events come first.** 24 of the 67 command handlers publish nothing today — the gaps are
  `printer`, `templates`, `shift-exchanges`, `establishments` and `users`. Every command emits its
  event even where nothing listens yet, because a write with no event is exactly a write the cache
  will never hear about.
- **Events invalidate, they do not write.** The handler deletes the keys its command dirtied and the
  next read repopulates from Postgres. Writing the new value straight from the event instead lets two
  commands arriving out of order leave the older value in Redis, where the TTL would keep it for
  hours. Deleting is idempotent and cannot invert.
- **Cache the request preamble before the queries.** Every authenticated request already makes two or
  three round-trips before its handler runs: `getUserRole`, `getEstablishmentMemberRole`, the module
  list and the subscription state, all inside guards. That is the hottest read in the app and the one
  that pays for itself first. It also has to be the most carefully expired: `MemberRoleChanged` and
  `MemberRemoved` already exist, and a withdrawn permission must never wait out a TTL.
- **8 hours of TTL** as the backstop, roughly a working day, so a missed invalidation cannot outlive
  the shift that saw it and the instance stays small enough to stay cheap.
- Redis also fixes something already broken: `ThrottlerModule` counts in memory, so across more than
  one Cloud Run instance the 300/min limit is really 300 per instance.

### 3. Public menu

A QR on the table showing the catalogue: unauthenticated, read-only, and identical for every customer
— the one screen where caching is the design rather than an optimisation, which is why it comes after
Redis. It needs a route that sits outside every guard, so what it exposes (prices yes, stock and
takings no) and how hard a stranger can hit it are part of building it, not a later pass.

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
