# Renaming `Bar` to `Establishment`

A runbook for step 2.1 of the [roadmap](../../TODO.md), not a description of the system. Delete it
once the rename has shipped and nothing in the repo still answers to the old name.

The product is widening beyond hospitality, so the aggregate root stops being a bar. `barId` appears
around 3.200 times: the work is mechanical, and the danger is concentrated in four places that a
find-and-replace will happily walk into.

## The five traps

1. **The migration.** Left to itself, `prisma migrate dev` renders a rename as `DROP` + `CREATE` and
   takes the rows with it. The SQL is written by hand, as `ALTER TABLE ... RENAME`.
2. **The print bridge.** It shares four wire contracts with the API and no test spans both sides,
   so a half-done rename breaks printing in silence rather than failing a build.
3. **Enum values that are stored data.** `AdminAuditAction.BAR_PLAN_GRANTED` and
   `AdminAuditTargetType.BAR` are written into `AdminAuditLog.action` and `.targetType` as plain
   strings. Rename them in TypeScript alone and every audit row already on disk stops matching its
   translation key and its target-type filter. They need rewriting in the same migration.
4. **The words that are not the venue.** `top-app-bar`, `Toolbar`, `snackbar` — and the Spanish
   _barra_, which is the counter.
5. **The translation files.** A key renamed in `es.json` and forgotten in `en.json` fails the build,
   which is the good outcome; renamed in neither shows a raw key to a user.

## Identifier map

| Before                                                                               | After                                                                                              |
| ------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------- |
| `Bar`, `BarId`, `barId`                                                              | `Establishment`, `EstablishmentId`, `establishmentId`                                              |
| `BarMember`, `BarRole`, `BarMemberId`                                                | `EstablishmentMember`, `EstablishmentRole`, `EstablishmentMemberId`                                |
| `BarSubscription`, `BarBillingSource`                                                | `EstablishmentSubscription`, `EstablishmentBillingSource`                                          |
| `BarPermission`, `'bar:view-orders'`                                                 | `EstablishmentPermission`, `'establishment:view-orders'`                                           |
| `asBarId`, `asBarRole`, `asBarMemberId`                                              | `asEstablishmentId`, `asEstablishmentRole`, `asEstablishmentMemberId`                              |
| `joinBar`, `leaveBar`                                                                | `joinEstablishment`, `leaveEstablishment`                                                          |
| `BAR_NOT_FOUND`, `INVALID_BAR_ID`, `MISSING_BAR_ID`, `STRIPE_WEBHOOK_BAR_ID_MISSING` | `ESTABLISHMENT_*`                                                                                  |
| `BAR_TIME_ZONE`                                                                      | `ESTABLISHMENT_TIME_ZONE`                                                                          |
| `BarGateway`, `BarPermissionsGuard`                                                  | `EstablishmentGateway`, `EstablishmentPermissionsGuard`                                            |
| `/bars/:barId`                                                                       | `/establishments/:establishmentId`                                                                 |
| `@coaster/bars`, `@coaster/bar-members`, `@coaster/bar-subscription`                 | `@coaster/establishments`, `@coaster/establishment-members`, `@coaster/establishment-subscription` |

## Do not touch

Match on whole identifiers, never on the substring `bar`, and read the diff before committing.

- Angular and Material: `top-app-bar`, `bottom-nav`, `Toolbar`, `MatToolbar`, `ngToolbar`,
  `ToolbarWidget`, `snackbar`, `progress-bar`, `AppBar`.
- The Spanish _barra_, the counter you serve drinks over, which stays whatever the establishment
  turns out to be: `orders.bar_order` ("Pedido de Barra"), `orders.bar_orders`, `orders.no_table`
  ("Sin mesa (barra)"), `orders.all_served_desc`.
- `templates.products.rom_barcelo_coke` and `rom_barcelo_neat` — Ron Barceló.
- The landing page copy under `landing.*`. It is still selling to hospitality, and it should keep
  saying "bar" until there is a reason not to.

## Order of work

`packages/common` first, because everything compiles against it, then outwards. One commit per
layer, so a bad rename bisects in a minute.

### 1. `packages/common`

Interfaces, `constants/`, `utils/brands.ts` and `domain/permissions/`. Then rebuild — both apps
consume the build, not the source:

```bash
npm run build -w @coaster/common && docker compose restart api
```

### 2. Database

Nine models carry `barId`: `BarMember`, `Shift`, `Category`, `Table`, `Order`, `PrinterConfig`,
`PrintJob`, `BarSubscription` and `TimeEntry`.

In PostgreSQL a rename is a catalogue update — instant, and triggers, indexes and foreign keys
follow it on their own. Confirmed for the one place it matters: `time_entry_append_only`, behind the
`time_entry_no_update` and `time_entry_no_delete` triggers, never names `barId` in its body, so the
append-only guarantee survives untouched.

The migration is three kinds of statement:

```sql
ALTER TABLE "Bar" RENAME TO "Establishment";
ALTER TABLE "Order" RENAME COLUMN "barId" TO "establishmentId";
ALTER INDEX "TimeEntry_barId_sequence_key" RENAME TO "TimeEntry_establishmentId_sequence_key";
```

Constraints too (`ALTER TABLE ... RENAME CONSTRAINT "Order_barId_fkey" TO ...`), or the names drift
from the columns and the next person reading `\d` has to guess. `prisma migrate diff` is useful to
check nothing was missed, but the file that ships is the hand-written one.

The same migration rewrites the audit log, which stores its enums as text. Four explicit statements
rather than string surgery, so the diff says exactly what it does:

```sql
UPDATE "AdminAuditLog" SET action = 'ESTABLISHMENT_PLAN_GRANTED' WHERE action = 'BAR_PLAN_GRANTED';
UPDATE "AdminAuditLog" SET "targetType" = 'ESTABLISHMENT' WHERE "targetType" = 'BAR';
```

`AdminAuditLog` has no trigger protecting it, unlike `TimeEntry` — this is our own operational log,
and rewriting it keeps history readable rather than losing it.

### 3. API

Folders `src/bars`, `src/bar-members`, `src/bar-subscription` and their aliases in
`apps/api/tsconfig.json`. Beyond the mechanical pass, two spots hold the name in a string rather
than an identifier, so the compiler will not catch them:

- `core/security/guards/subscription-active.guard.ts` matches billing routes with a regex,
  `SUBSCRIPTION_MANAGEMENT_PATH`. It has to become
  `/\/establishments\/[^/]+\/establishment-subscription(\/|$)/` or every write starts returning 402.
- `src/ai/tools/*` describe themselves to the model in prose — "the bar's tables", "products in the
  bar". Rewrite the `describe()` strings, or the assistant keeps reasoning about bars.

### 4. Web

Libs `src/app/bars`, `bar-members`, `bar-subscription`; `presentation/bars`; the aliases in
`apps/web/tsconfig.json`; the routes; `e2e/pom/bars.page.ts` and `e2e/tests/bars.spec.ts`.

Keep one redirect in `app.routes.ts` so existing bookmarks survive — it replaces the `bar → bars`
one already there:

```ts
{ path: 'bars', redirectTo: 'establishments' }
```

Visible Spanish copy changes with the keys: "bar" becomes "establecimiento" everywhere except the
landing.

### 5. Print bridge

The bridge and the API share four wire contracts, and **all four were cut over at once**, with no
compatibility window. That was a deliberate call: nothing is deployed in the field yet, so the two
releases the safe path would have needed buy nothing. If a bridge ever does turn out to be running
an older binary, it stops printing until it self-updates from `/printer/check-version`.

Both sides have to move together, or printing breaks silently — no test spans the two:

| Contract        | API                                                              | Bridge                                    |
| --------------- | ---------------------------------------------------------------- | ----------------------------------------- |
| JWT claim       | `PrinterTokenService.generateToken` signs `establishmentId`      | `JWTPayload.EstablishmentID` reads it     |
| Job polling     | `@Query('establishmentId')` on `jobs/next` and `jobs/:id/result` | `relay.go` sends `?establishmentId=`      |
| IP registration | `RegisterPrinterIpDto.establishmentId`                           | `ip_registrar.go` posts `establishmentId` |
| Ticket payload  | `PrintTicketPayload.establishmentName`                           | `escpos.TicketPayload.EstablishmentName`  |

The environment variable moved with them: `BAR_ID` is now `ESTABLISHMENT_ID`, and `--bar-id` is
`--establishment-id`. Anyone with an existing bridge has to edit its `.env` or service file by hand.

### 6. Docs

`README.md`, `docs/architecture/*`, `docs/operations/time-tracking.md`, `docs/admin/backoffice.md`.
The prose already says "venue" in places; unify on "establishment".

## Verification

Per layer, not at the end. Accumulate the whole rename and the first failure arrives with 200 files
touched.

```bash
npm run build -w @coaster/common && npm test && npm run test:e2e -w @coaster/api
```

`apps/web/src/app/core/translations.spec.ts` is the strongest net here: it asserts `es.json` and
`en.json` hold an identical set of keys, that no value is blank, and that every `ErrorCodes` value
has a message in both. A half-finished i18n rename cannot reach `main`.

Two greps close the loop — one for what should be gone, one for what should have stayed:

```bash
grep -rn "barId\|BarId\|DbBar\b" apps packages --include="*.ts" | grep -v node_modules
```

```bash
git diff -U0 | grep -iE "toolbar|snackbar|top-app-bar|bar_order|barcelo"
```

The first should return only the bridge's temporary aliases. The second should return nothing at
all.

With the migration applied, confirm the append-only triggers came through the rename:

```bash
docker compose exec db psql -U postgres -d coaster -c '\d "TimeEntry"'
```
