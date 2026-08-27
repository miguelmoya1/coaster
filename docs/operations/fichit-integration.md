# Fichit

Coaster used to keep its own working-time register — the art. 34.9 one, hash-chained and
append-only. Fichit does the same job as its whole product rather than as one module of eight, so
the two implementations were the same law written twice.

**The move is done.** Coaster stores no time at all: no table, no chain, no triggers. It registers
with Fichit **as a partner**, every establishment is a company there and every member an employee,
and the register is Fichit's from the first clock-in.

## What a partner is

A normal Fichit API key belongs to one company. A partner sits a level above: one credential that
creates companies and administers all of them.

```
Coaster (partner)     ─── one subscription, not billed
  ├── Bar Pepe        ─── employees, kiosks, punches
  ├── Bar Manolo
  └── Cafetería Sol
```

The key never leaves the Coaster API. It is read once from `FICHIT_API_KEY` and is only ever held by
`FichitApi`; nothing else in the codebase knows it exists. Every call that acts on one company names
it in the `Fichit-Company` header — the same shape as Stripe Connect's `Stripe-Account`, which is
where Fichit took it from.

## Off by default

Without `FICHIT_API_URL` **and** `FICHIT_API_KEY` the integration is off: `FichitApi.enabled` is
false, every sync returns early and nothing is called. That is the correct state for local
development and for any environment that does not have a Fichit in front of it yet, and it is why
adding this module could not break a single existing test.

```
FICHIT_API_URL=https://api.fichit.es
FICHIT_API_KEY=fk_...
```

**One key per environment.** Beta points at Fichit's beta and holds a beta key; the key that beta
holds must not be able to touch production data. It goes in the Cloud Run service like the other
runtime secrets — see [environments](environments.md).

## What maps to what

| Coaster                 | Fichit             | Key                            |
| ----------------------- | ------------------ | ------------------------------ |
| `Establishment`         | company            | `external_id` = establishment id |
| `EstablishmentMember`   | employee           | `external_id` = **user** id      |
| The oldest `OWNER`      | the company's owner account | —                      |

The link is stored on both sides. Coaster keeps `Establishment.fichitCompanyId` and
`EstablishmentMember.fichitEmployeeId`; Fichit keeps the `external_id` it was given. Two records of
the same fact, and either one can rebuild the other.

**A user who works in two establishments is two employees in Fichit.** Two contracts, two working
days, two registers the labour inspectorate can ask for separately. The employee `external_id` is
the Coaster **user** id, and it only has to be unique inside its company — which is exactly what
Fichit enforces.

## Why nothing can be created twice

Both calls are idempotent on the key above, and that is the whole design:

- `POST /api/v1/partner/companies` with the same `external_id` returns the company that already
  exists — `200` and `existing: true` — instead of creating a second one.
- `POST /api/v1/b2b/employees` with the same `external_id` updates the employee it already has.

This matters for the case that is easy to forget: the call **succeeds** and the response is lost — a
timeout, a pod restart between the HTTP call and the database write. Without the external id, the
retry would create a second company with a real owner account attached to it, and nothing would ever
tell us. With it, the retry finds the first one and finishes the link.

## What happens when Fichit is down

Nothing, as far as Coaster is concerned. The event handlers log the failure and return; the create
that triggered them has already been committed. `fichitCompanyId` simply stays `NULL`.

Repair is the same code path as the first attempt: `ensureCompany` and `ensureEmployee` are written
so that calling them again on a half-linked record finishes the job. That is what the backfill runs,
and it is why there is no separate reconciliation logic to keep in step with the creation logic.

```
POST /admin/fichit/backfill    → { companies, employees, failed }
GET  /admin/fichit             → { enabled }
```

The same endpoint does the **initial** load: establishments that existed before any of this get
linked by the first run. It works in batches of 200 and is safe to run as many times as you like.

## The flow

| Coaster event             | What happens in Fichit                                    |
| ------------------------- | --------------------------------------------------------- |
| `EstablishmentCreatedEvent` | company created, its owner registered as an employee     |
| `MemberInvitedEvent`      | employee created or updated                                |
| `MemberRemovedEvent`      | employee deactivated                                       |
| `ShiftCreatedEvent`       | shift mirrored, so the report can contrast it                |
| `ShiftDeletedEvent`       | mirrored shift removed                                      |

`EstablishmentCreatedEvent` was added for this. Establishment creation used to write to the database
and say nothing, so there was nothing to react to.

Removal is a deactivation, never a delete: an employee with punches behind them cannot be erased
without breaking the chain that gives the register its legal value. An employee Fichit no longer
knows about (`404`) counts as already retired; any other failure is raised so the caller can retry.

## Setting it up

1. In Fichit's platform panel, create the partner and issue it a key —
   `POST /api/v1/platform/partners`, then `/keys`. **The key is shown once.**
2. Put `FICHIT_API_URL` and `FICHIT_API_KEY` on the Cloud Run service for that environment.
3. Add the environment's web origins to Fichit's `FICHIT_CORS_ORIGINS`, or the browser will refuse
   the punch before it leaves.
4. Deploy, then `POST /admin/fichit/backfill` and read the report.
5. Check the numbers against `GET /api/v1/platform/partners/{id}` in Fichit's panel: the count of
   companies and active employees should match what Coaster has.
6. Clock in from one venue and check the mark landed in Fichit.

## Who owns what

The line runs through the middle of the feature, and it is the thing to keep straight:

| | Coaster | Fichit |
| :--- | :--- | :--- |
| Who may clock, who may correct | **owns it** | trusts Coaster |
| The marks, the chain, the seals | stores nothing | **owns it** |
| The rota | **owns it**, mirrors it over | draws the contrast |
| Reports, CSV, the inspection PDF | asks for them | **produces them** |

## The clock-in goes straight there

From the worker's browser to Fichit, without passing through Coaster's server. If Coaster is down,
its customers keep meeting their legal duty — which is the whole reason this moved out.

```
POST /establishments/:id/time-entries/session   → { baseUrl, companyId, employeeId, session }
```

Coaster mints an **employee** session with its partner key and hands it over; the browser then talks
to Fichit on its own. Three details make that safe, and all three are load-bearing:

- The **Firebase token never reaches Fichit**. `idTokenInterceptor` only attaches it to URLs that are
  ours, and the handover URL is absolute.
- A **401 from Fichit does not log you out of Coaster**. It used to: `unauthorizedInterceptor` logged
  out on any 401 anywhere, so an expired Fichit token would have thrown the user out of the app. It
  now only reacts to our own origins.
- An expired session **re-mints instead of refreshing**. The store drops the handover on a 401 and
  asks Coaster for a new one, which works for as long as the user is logged into Coaster and keeps
  one fewer long-lived credential sitting in the browser.

Fichit's `FICHIT_CORS_ORIGINS` has to list the web origins for that environment, or the browser will
refuse the call before it leaves.

## Everything else reads through Coaster

The timesheet, the export, the integrity check and the manual corrections go to Coaster, which
checks its own permissions and then calls Fichit with the partner key. **It stores nothing**; it
maps Fichit's report into the shape the screens already draw and passes it on.

```
GET  /establishments/:id/time-entries?from&to[&userId]   the team's days
GET  /establishments/:id/time-entries/me?from&to         your own
GET  /establishments/:id/time-entries/punches?from&to    the marks behind them
GET  /establishments/:id/time-entries/export?from&to     CSV for an inspection
GET  /establishments/:id/time-entries/integrity          the chain, as Fichit verified it
POST /establishments/:id/time-entries                    a mark someone forgot
POST /establishments/:id/time-entries/:punchId/amend
POST /establishments/:id/time-entries/:punchId/void
```

**Why not hand the browser a Fichit admin session too?** Because a Fichit admin session grants
everything on that company — employees, punches, reports, billing — and a Coaster `MANAGER` would
end up with more power over there than they have here. Coaster's roles have to stay the authority on
what a manager can do, and the only way to keep that true is to make the call itself. The clock-in is
the exception on purpose: it uses an *employee* session, which can do nothing but clock, and it earns
the exception by surviving a Coaster outage.

Fichit is month-based and the screens ask for a date range, so a range that spans months fetches each
month and keeps the days that fall inside it.

## The rota crosses too

Planned against worked is a contrast that spans two services, so **the shifts go to Fichit** and the
report is drawn in one place. `Shift.fichitShiftId` holds the mirror.

The alternative — Coaster asking Fichit for the worked hours to draw its own comparison — would have
meant two services queried to paint one row, and two implementations of the same contrast.

## What is left in Coaster

The link columns, the permissions and the screens. No marks, no chain, no triggers. If you go looking
for a working day in Coaster's database you will not find one, and that is the point: half an
implementation left switched off is worse than none, because it looks like it is keeping something.
