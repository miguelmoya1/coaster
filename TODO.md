# Coaster roadmap

What is left, in the order it should be built. Technical detail lives in [`docs/`](docs/README.md);
this file is only the running order.

Phase 1 (time tracking and legal compliance) is closed — see
[Time tracking](docs/operations/time-tracking.md).

## Phase 2: from bars to establishments

The working-time register is a legal obligation for every Spanish employer, not only for hospitality.
The product cannot serve them: the aggregate root is `Bar`, and every screen assumes tables, orders
and stock exist. Widening that root and putting the hospitality features behind per-establishment
module toggles opens the register to shops and offices without showing them a menu.

Modules: `TIME_TRACKING` (always on — it is the legal one), `ORDERS` (tables, orders, payments,
printing) and `INVENTORY` (categories, products, stock). Enabling `ORDERS` forces `INVENTORY` on,
because an order is products from the catalogue.

### 2.1 Rename `Bar` to `Establishment`

Mechanical, no behaviour change. One commit per layer so a bad rename is cheap to bisect. The
identifier map, the words that must survive it, the hand-written migration and the checks per layer
live in the [rename runbook](docs/operations/establishment-rename.md) — read it before starting, it
is where the four ways to lose data or stop printing are written down.

1. `packages/common` first — everything else compiles against it. Rebuild its `dist`, both apps
   consume the build and not the source.
2. Prisma: one hand-written migration of `ALTER TABLE ... RENAME`, metadata-only in Postgres.
   Triggers, indexes and foreign keys follow the rename on their own. Do not let `migrate dev`
   generate it: left alone it emits `DROP` + `CREATE` and takes the data with it.
3. API: `src/bars`, `src/bar-members`, `src/bar-subscription`, their `@coaster/*` aliases, the
   permissions guard and the websocket gateway. `/bars/:barId` becomes
   `/establishments/:establishmentId`. Two places hold the name in a string the compiler cannot
   check: the billing regex in `SubscriptionActiveGuard` and the prose the AI tools describe
   themselves with.
4. Web: the three `bars` libs, `presentation/bars`, the routes and the i18n keys. Keep a
   `bars → establishments` redirect so existing bookmarks survive.
5. Print bridge: it validates a `barId` JWT claim. Ship a bridge that accepts both claims **before**
   the API starts issuing the new one, or every already-installed bridge stops printing.

### 2.2 Configuration tables

- `EstablishmentSettings`, one per establishment, holding `modules` as an array of the enum. An
  array rather than a boolean column per module: a future module is then an enum value, not a
  schema migration.
- `UserPreferences`, one per user, born with `language` moved off `User` so it is not an empty table
  waiting for a purpose.
- Backfill: every existing establishment gets all three modules — today they are all bars.

### 2.3 Module gating

- The rule lives in `@coaster/common/domain/modules`, next to `domain/permissions` and in the same
  shape: pure functions, tested once, used by both sides.
- API: an `EstablishmentModulesGuard` mirroring `EstablishmentPermissionsGuard`. Because
  `TIME_TRACKING` is always on, it only ever guards `orders`/`tables`/`printer` and
  `categories`/`products`/`templates`. `stats` is the exception: takings need `ORDERS` but headcount
  does not, so its query handler returns the blocks that apply instead of refusing the whole request.
- The two invariants — `TIME_TRACKING` always present, `ORDERS` pulling `INVENTORY` in — are enforced
  in the write handler, not in the form, so the API does not depend on the UI behaving.
- The AI assistant filters its own tool set by the enabled modules, or it will offer to open a table
  in a law firm. The system prompt enumerates the tools, so that list comes from the filtered set too.
- Web: a `moduleGuard` on the routes and one extra condition in the bottom nav's existing filter.
  An establishment with only time tracking is left with Dashboard, Schedule and Team.
- `permissionGuard` falls back to redirecting at `/orders` when a permission is missing. In an
  establishment without `ORDERS` that is a dead route: it has to aim at the first section that is
  both enabled and permitted.
- An owners-only settings screen for the toggles. Choosing them for the first time belongs to the
  onboarding in 2.4, not here.
- Worth seeing working, more than any unit test: clock in and export the inspection CSV in an
  establishment with no hospitality module enabled. That circuit is the whole point of the phase.

### 2.4 Onboarding wizard for a new establishment

Nobody opens a settings screen they do not know exists, so a brand-new establishment gets asked
instead. A dialog on first entry, a couple of questions, and it ends configured:

1. **What kind of business is this?** Hospitality turns everything on; anything else leaves only
   `TIME_TRACKING`, which is the safe floor — a shop or an office is then one toggle away from
   inventory, rather than staring at a menu it will never use.
2. **Import the standard catalogue?** Only worth asking when `INVENTORY` ended up on. On finish it
   runs the import that `admin_templates.load_standard` already does today, so the establishment
   lands with a menu instead of an empty pantry.

What decides that an establishment is new is worth getting right: "has no `EstablishmentSettings`
row" is the honest signal, and it is also what every establishment backfilled in 2.2 will _not_
match, so none of them get the dialog.

### 2.5 Rename the rota

`nav.roster` is "Turnos", which is hospitality vocabulary. It becomes "Horario" / "Schedule", which
covers both what was planned and what was worked. i18n keys, one route and one folder — last,
because it is the only purely cosmetic step. `core/translations.spec.ts` spells the
`roster.time_tracking.` prefix out by hand, so it moves with them.

## Phase 3: intelligence layer

**Module:** AI recommendations (sales, inventory, staffing)

- **Architectural impact:** reads accumulated history from a scheduled job that persists into
  `DbAiRecommendation`. Note that Cloud Run stops the container when idle, so an in-process cron
  will not fire — this needs Cloud Scheduler hitting an endpoint, or work driven by traffic.
- **Flow:**
  1. **Sales:** best and worst performing products.
  2. **Inventory:** price adjustments for stagnant stock and dead rotation.
  3. **Staffing:** rota suggestions from historical load.

## Not scheduled

- Table reservations.
- Public menu for customers.
- Per-establishment time zone. `ESTABLISHMENT_TIME_ZONE` is a constant today; `EstablishmentSettings`
  is where it belongs, but moving it rewrites every workday calculation and the inspection CSV, and
  it buys nothing while the product is Spanish.
- **Landing copy for the wider market.** The rename deliberately leaves `landing.*` alone: it still
  sells to bars, and that is still who buys. The day the register is marketed to shops and offices,
  the hero, the use cases and the pricing table all need rewriting — a positioning job, not a
  refactor, which is why it is not part of phase 2.
- **Locking a product's name.** Renaming a product rewrites what every past order line appears to
  have sold, because `OrderItem` stores `priceAtPurchase` but never the name it was bought under.
  Either the name is frozen after the first sale, or the order line snapshots it the way `TimeEntry`
  snapshots the user. Worth settling which before touching it — and worth confirming whether the
  rule should hang on "added by hand" at all, or simply on "has been sold".

## Known debt

- **Open CORS** (`origin: '*'`) on both the API and the websocket gateway, pending a decision on
  the production domain. Narrow it to an allowlist before onboarding real venues.
- **Destructive backoffice actions**: deleting establishments and users was deliberately left out.
  If they are added, they must require typing the name to confirm and must land in the audit log.
- **Event bindings are not covered by the web tests.** Component specs assert rendered DOM and call
  methods directly; dispatched DOM events do not reach Angular listeners in that setup, so keyboard
  and click wiring is only ever verified by hand in a browser.
- **Browser e2e run against mocked HTTP.** The Playwright suite stubs every API response, so no
  automated test exercises browser → API → database end to end.
- **`member-roles.e2e-spec.ts` is flaky.** Seen failing once on the membership assertion and passing
  on two immediate re-runs with nothing changed in between, which points at state leaking between
  tests rather than at the code under test. It will read as a broken rename or a broken feature the
  next time it fires, so it is worth pinning down before it wastes someone's afternoon.
