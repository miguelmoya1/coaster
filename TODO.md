# Coaster roadmap

What is left, in the order it should be built. Technical detail lives in [`docs/`](docs/README.md);
this file is only the running order.

## Next

### 1. Get the catalogue out of translation keys

Designed in [catalogue and menu](docs/architecture/catalogue-and-menu.md). Imported products are
stored as `templates.products.coffee_black` rather than "Café solo", so everything that is not the
Angular app reads keys — the assistant already does, and the menu would show them to customers.
Worse, the key is generated from whatever an admin types while the translation is hand-written in the
web and deployed, so adding one product to the catalogue silently creates a broken one.

The starter catalogue becomes a versioned file, the establishment gets a language, and the import
writes words. It deletes far more than it adds: two tables, the `templates` module, the admin editor,
the `templates.*` i18n blocks, and — with words in the column — `isTemplateName`, the rename lock and
`PRODUCT_NAME_FROM_TEMPLATE`.

Worth doing before there is a live establishment: afterwards it means picking a language for every
venue already storing keys, with nothing to pick it from.

### 2. Public menu

A QR showing a menu the establishment publishes, in the customer's language. Not a view over the
catalogue: the catalogue is operational and private, and holds things nobody should read. The menu is
its own document — sections, order, descriptions, translations, an optional price of its own — and
publishing renders it once into a snapshot the public route reads whole.

That snapshot is why this now comes before Redis rather than after: a published menu is one row and
one language pick, so it is already fast without a cache in front of it.

Explicitly not ordering from the QR. That is a different product with payments and table state in it.

### 3. Redis in front of the hot path

**Not a cache over everything.** Orders, the catalogue, shifts and stats keep going straight to
Postgres: they change constantly, they are read by few people at once, and caching them buys latency
nobody notices in exchange for a stale figure somebody acts on. What goes in Redis is the preamble
every authenticated request pays before its handler even starts.

- **What is cached.** `getUserRole`, `getEstablishmentMemberRole`, the establishment's module list
  and its subscription state — all four run inside guards, on every single request, and all four
  change a few times a month at most. Read them from cache and every endpoint in the app loses two or
  three round-trips at once. The user record behind `CurrentUser` is the same shape of data and joins
  them.
- **A miss is not an error.** Not in Redis means ask Postgres, hand back the answer and store it on
  the way out. Nothing changes for the caller, and Redis being down has to degrade into today's
  behaviour rather than into an outage.
- **A change deletes the key, it never rewrites it.** Change a role, remove a member, toggle a module
  and the event handler drops that key; the next request repopulates from Postgres. Writing the new
  value from the event instead lets two commands arriving out of order leave the older one in Redis,
  where the TTL would keep it for hours. Deleting is idempotent and cannot invert.
- **The events those deletions hang off.** `MemberRoleChanged` and `MemberRemoved` already exist.
  `update-establishment-settings` and `update-user` publish nothing today and will have to. Another
  fourteen command handlers are silent too once `templates` is gone — `printer`, `shift-exchanges`,
  the rest of `establishments`; every command should end up emitting its event even where nothing
  listens, but only those two block this step.
- **8 hours of TTL** as the backstop, roughly a working day, so a missed invalidation cannot outlive
  the shift that saw it and the instance stays small enough to stay cheap.
- Redis also fixes something already broken: `ThrottlerModule` counts in memory, so across more than
  one Cloud Run instance the 300/min limit is really 300 per instance.

### 4. Help with the translations

The checklist of what has no wording yet in each language, and then the assistant translating a menu
in one pass — once per item rather than once per request, so a 50-item menu is about one message of
the monthly allowance. Reviewed before it saves.

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

- **Renaming a hand-typed product rewrites history.** `OrderItem` stores `priceAtPurchase` but never
  the name it was sold under, so a receipt reprinted after a rename shows a sale that never happened
  under that name. Imported products are safe — their names are locked — but typed ones are not. The
  fix is for the order line to snapshot the name the way `TimeEntry` snapshots the user.
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
