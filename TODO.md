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

Both halves are in place: the budget caps what one message costs, and a monthly allowance per
establishment caps how many arrive — 500 on a paid plan, 100 while on trial, both environment
variables (`AI_MONTHLY_MESSAGES`, `AI_TRIAL_MONTHLY_MESSAGES`). The numbers came from the cost of a
message measured after the budget landed, and are worth revisiting once there is real usage to look
at.

## In progress: pairing the printer bridge

The downloaded binary is generic and expects `--establishment-id` and `--device-key`, which no
customer will ever pass — printing from outside the local network is effectively unusable today.

The app hands out a one-use code and a download named with it, the bridge reads its own filename on
first run, redeems the code for the ids it needs and writes them beside itself. Nobody types
anything.

- **Done — the API.** `PrinterPairing` with a one-use, hour-long code; `POST
/establishments/:id/printer/pairing` to issue one; `POST /printer/pair` for a bridge that has no
  credentials yet to redeem it. Codes avoid the characters people mistype, and are recovered from a
  filename a browser may have renamed to `name (1).exe`.
- **Left — the download.** A route that serves the binary as `coaster-printer-<code>.exe`, since the
  static asset is the same file for everyone today.
- **Left — the bridge.** Read `os.Args[0]`, redeem, persist a config file, and fall back to a local
  setup page asking for the code when the filename carries none.
- **Left — the app.** A printer screen with the download button; `generateDeviceKey` has existed on
  the API all along with no UI ever calling it.

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
