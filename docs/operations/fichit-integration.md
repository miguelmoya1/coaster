# Fichit

Coaster keeps its own working-time register, described in [time tracking](time-tracking.md). Fichit
is a service that does the same job — the art. 34.9 register, hash-chained and sealed — and does it
as its whole product rather than as one module of eight. The two implementations are the same law
written twice, so one of them has to go.

This is the first half of that move. Coaster registers with Fichit **as a partner**: every
establishment becomes a company there, every member becomes an employee, and the data stays in step.
Clocking has not moved yet — that is the next step, and it is the delicate one.

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
| `ShiftCreatedEvent`       | shift mirrored — only once the venue has moved              |
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
6. Move one venue, watch it for a week, then move the next.

## Moving the clocking

`Establishment.fichitClockingSince` is the switch. `NULL` means the venue still clocks here; a date
means it clocked in Fichit from that instant.

**It is a date and not a boolean because the history does not move.** Coaster's hash chain cannot be
rewritten, and it cannot be imported into Fichit's without faking the sequence and the seals that
give it its legal value. So each side keeps its stretch, and this column is the border between the
two: everything before it is read here, everything after it lives in Fichit.

That is why the move is one venue at a time, and why it is a decision rather than a deploy:

```
POST   /admin/fichit/establishments/:id/clocking   → { since }
DELETE /admin/fichit/establishments/:id/clocking   → undo
```

**Undo only works while Fichit has recorded nothing.** Once someone has clocked there, moving back
would leave the venue's register split across two services with a gap in the middle, and no report
would show the whole thing. The endpoint checks and answers `409`.

### What closes, and what stays open

Once a venue has moved, `ClockingMovedGuard` closes Coaster's four write routes — `clock`, the
manual entry, the amendment and the void — with `409 CLOCKING_MOVED_TO_FICHIT`. The read routes stay
open, unchanged, serving the history Coaster recorded. The append-only trigger stays too: it is what
guarantees that history is still the one that was written.

Coaster's timesheet becomes an **archive** of its own stretch. It does not federate Fichit's data
into it — translating between two domain models would be the same duplication this migration exists
to remove, with a seam in the middle where the numbers could disagree. The period after the switch
is read in Fichit, which has its own reports, its CSV and the PDF for the inspectorate.

### The punch goes straight there

From the worker's browser to Fichit, without passing through Coaster's server. If Coaster is down,
its customers keep meeting their legal duty — which is the whole point of moving this out.

```
POST /establishments/:id/time-entries/session   → { baseUrl, companyId, employeeId, session }
```

Coaster mints the session with its partner key and hands it over; the browser then talks to Fichit
on its own. Three details make that safe, and all three are load-bearing:

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

### The roster crosses too

Planned against worked is a contrast that now spans two services, so **the shifts go to Fichit** and
the report is drawn in one place. `Shift.fichitShiftId` holds the mirror, and it is only filled for
venues that have already moved: rostering a shift in a venue that still clocks here changes nothing.

The alternative — Coaster asking Fichit for the worked hours to draw its own comparison — would have
meant two services queried to paint one row, and two implementations of the same contrast.

## What has not moved yet

The manual side of the register: creating an entry someone forgot, amending one, voiding one. Those
still exist in Coaster for its own history, and in Fichit for its own. Nothing reads across.
