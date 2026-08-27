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

`EstablishmentCreatedEvent` was added for this. Establishment creation used to write to the database
and say nothing, so there was nothing to react to.

Removal is a deactivation, never a delete: an employee with punches behind them cannot be erased
without breaking the chain that gives the register its legal value. An employee Fichit no longer
knows about (`404`) counts as already retired; any other failure is raised so the caller can retry.

## Setting it up

1. In Fichit's platform panel, create the partner and issue it a key —
   `POST /api/v1/platform/partners`, then `/keys`. **The key is shown once.**
2. Put `FICHIT_API_URL` and `FICHIT_API_KEY` on the Cloud Run service for that environment.
3. Deploy, then `POST /admin/fichit/backfill` and read the report.
4. Check the numbers against `GET /api/v1/platform/partners/{id}` in Fichit's panel: the count of
   companies and active employees should match what Coaster has.

## What has not moved yet

Clocking. `TimeEntry` is still written by Coaster, and Fichit's register for these companies is
empty. That comes next, one establishment at a time behind a switch — not all at once.
