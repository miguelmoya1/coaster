# Coaster roadmap

What is left, in the order it should be built. Technical detail lives in [`docs/`](docs/README.md);
this file is only the running order.

Phase 1 (time tracking and legal compliance) is closed — see
[Time tracking](docs/operations/time-tracking.md).

## Phase 2: intelligence layer

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

## Known debt

- **Open CORS** (`origin: '*'`) on both the API and the websocket gateway, pending a decision on
  the production domain. Narrow it to an allowlist before onboarding real venues.
- **Destructive backoffice actions**: deleting bars and users was deliberately left out. If they
  are added, they must require typing the name to confirm and must land in the audit log.
- **Event bindings are not covered by the web tests.** Component specs assert rendered DOM and call
  methods directly; dispatched DOM events do not reach Angular listeners in that setup, so keyboard
  and click wiring is only ever verified by hand in a browser.
- **Browser e2e run against mocked HTTP.** The Playwright suite stubs every API response, so no
  automated test exercises browser → API → database end to end.
