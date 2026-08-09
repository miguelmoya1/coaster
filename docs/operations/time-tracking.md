# Time tracking

The working-time register required by art. 34.9 of the Spanish Workers' Statute (as amended by
RD-ley 8/2019). The law asks for three things, and they drive the whole design: the original
clock-in must not be overwritable, every correction must record who / when / what / why, and the
worker must be able to see their own day and any changes made to it. Records must be kept for four
years and be available to workers, their representatives and the labour inspectorate.

The law does **not** prescribe a format. Paper is compliant. That is worth knowing before adding
machinery: CSV export satisfies "make it available", and cryptographic anchoring is an engineering
choice, not an obligation.

The module lives in `apps/api/src/time-tracking` and hangs off `bars/:barId/time-entries`.

## The table is the audit trail

`TimeEntry` is **append-only**. There is no `UPDATE` and no `DELETE`: the database refuses them with
a trigger (`time_entry_append_only`). Correcting a mark means inserting a new row that points at the
previous one through `supersedesId`.

```text
entry-1  RECORDED  08:00  (worker clocked in)
entry-2  AMENDED   07:30  supersedes entry-1  reason: "came in earlier, clocked in late"
entry-3  VOIDED    07:30  supersedes entry-2  reason: "duplicate mark"
```

All three rows share `rootId = entry-1`. Everything derives from that:

- **current state** of a mark: the row in the group with the highest `sequence` (nothing supersedes
  it);
- **history**: the whole group in order, which is what `TimeEntry.revisions` returns;
- **voided mark**: a group whose head is `VOIDED`. It is neither deleted nor hidden, it is shown
  struck through, and it does not count towards totals.

Because there is no mutable state, the data and its audit trail cannot drift apart: they are the
same row. That is why the trail is **not** written by a separate event handler, unlike the
backoffice: there, a lost audit entry is a logging bug; here it would be a fine.

## Hash chain

Every row carries `sequence` (monotonic per bar), `prevHash` and `hash`:

```text
hash = sha256(prevHash + "id|barId|userId|rootId|type|action|occurredAt|recordedAt|workdayDate|userName|userEmail|source|supersedesId|actorId|reason|sequence")
```

Inserting takes `pg_advisory_xact_lock(hashtext(barId))` so two simultaneous clock-ins at the same
bar cannot fork the chain. The `id` is a UUID generated in the repository, not by the database,
because it goes into the hash and has to be known before the `INSERT`.

`recordedAt` (the server clock) is inside the hash alongside `occurredAt`, so the chain seals both
the hour worked and the moment it was recorded or corrected.

`workdayDate` and `userSnapshot` are in there too: without them a mark could be moved to another day
or reassigned to somebody else without breaking the chain. The `BEFORE UPDATE` / `BEFORE DELETE`
triggers already refuse both; the hash is the backstop for somebody with enough privileges to
disable them or restore a doctored dump.

`GET /bars/:barId/time-entries/integrity` recomputes the whole chain for a bar and reports whether
it is valid and, if not, which row breaks it.

The chain proves internal consistency, not age. Somebody with SQL access who rewrites every row and
recomputes every hash produces a chain that verifies. Defending against that would need daily seals
published or timestamped externally; it was built, then deliberately removed, because nothing in the
regulation asks for it and the triggers already stop everything short of privileged database access.

## The workday

A mark is one of `CLOCK_IN`, `BREAK_START`, `BREAK_END` or `CLOCK_OUT`, and is only accepted if the
state machine allows it: out → in → break → in → out. Breaks are first-class marks and are corrected
the same way as clock-in and clock-out.

`workdayDate` groups the shift, not the calendar day: a shift that starts at 22:00 and ends at 03:00
belongs entirely to the day it started. The timezone is `Europe/Madrid` (`BAR_TIME_ZONE`).

There is **no restriction on the hour**. A 05:00 clock-in for kitchen prep is fine; only the
sequence is validated.

A worker's own marks use **the server clock**; the client never sends a time. Client-supplied times
only exist in corrections, which require a reason and are signed.

### Contrast against the rota

`Workday` is derived, not stored, and carries `plannedMinutes`, `plannedStart`, `plannedEnd` and a
list of discrepancies:

| Discrepancy    | Meaning                                               |
| -------------- | ----------------------------------------------------- |
| `NO_SHOW`      | a shift was scheduled and there are no marks at all    |
| `UNPLANNED`    | somebody worked with nothing on the rota               |
| `LATE_START`   | first mark more than 10 minutes after the shift began  |
| `EARLY_FINISH` | `CLOCK_OUT` more than 10 minutes before it ended       |
| `OVERTIME`     | worked noticeably longer than planned                  |

Ten minutes of tolerance, so arriving two minutes late is not flagged. `EARLY_FINISH` is only
considered once there is a `CLOCK_OUT`: somebody still clocked in has not left early, they simply
have not left.

Days are seeded from the rota as well as from the marks. Built only from marks, a scheduled day
nobody clocked into produced no group and therefore no row — the absence, which is exactly what a
manager wants to see, was invisible.

## Who corrects what

Everyone corrects their own marks (`bar:amend-own-time-entry`, which everybody has) with a reason.
Touching somebody else's requires `bar:manage-time-entries`. There are no approvals and no
intermediate states: the change takes effect immediately, and what provides the guarantee is the
history, which keeps the previous time, the new one, who changed it, when and why.

The guard cannot know whose mark it is, so the half of the rule that depends on ownership is checked
in `AmendTimeEntryHandler`, which answers `NOT_YOUR_TIME_ENTRY`.

Voiding stays with `MANAGER` and `OWNER`: removing a mark from the count weighs more than moving its
time, and it is recorded just the same.

## Endpoints

| Method and route  | Permission                 | For what                                                         |
| ----------------- | -------------------------- | ---------------------------------------------------------------- |
| `POST /clock`     | `bar:clock-in`             | Clock yourself in or out, and breaks                             |
| `GET /me`         | membership                 | My workday with its history of changes                           |
| `GET /`           | `bar:view-time-entries`    | The team's workdays, filterable by person                        |
| `GET /export`     | `bar:view-time-entries`    | CSV, one row per revision, free `from`/`to` range                |
| `GET /integrity`  | `bar:manage-time-entries`  | Hash chain verification                                          |
| `POST /`          | `bar:manage-time-entries`  | Manually add a forgotten mark                                    |
| `POST /:id/amend` | `bar:amend-own-time-entry` | Correct a time (own, or anyone's with `bar:manage-time-entries`) |
| `POST /:id/void`  | `bar:manage-time-entries`  | Void a mark                                                      |

`bar:clock-in` and `bar:amend-own-time-entry` are held by everyone; the rest by `MANAGER` and
`OWNER`. Correcting and voiding require a reason of at least 5 characters and are refused if they
would leave the day inconsistent (`INVALID_CLOCK_SEQUENCE`) — for example voiding a clock-in and
orphaning the clock-out.

`GET /me` carries no permission: any member sees their own marks and any corrections made to them,
which is exactly what the law requires.

`POST /clock` carries `@SkipSubscriptionCheck()`. A venue that stops paying loses writes, but it
cannot lose its workers' time register: the legal obligation does not depend on the subscription
being current. Corrections and manual entries do require a live subscription.

## Retention

`TimeEntry`'s foreign keys are `RESTRICT`, not `CASCADE`: deleting a user or a bar that has marks
fails. Each row also stores `userSnapshot` with the worker's name and email at the moment of the
mark, so the register stands even if the account changes. The four-year legal custody is a deletion
policy, not an automatic cleanup: there is none today.

## Interface

Clocking has **no section of its own** in the bottom bar: it lives inside **Shifts**
(`presentation/bars/workspace/pages/roster`), because that is where the worker already goes to see
their shift. Everything is managed from there.

- **Clock card** (`clock-card`): current state, time worked and on break, and only the buttons the
  day allows at that moment. Visible to anyone with `bar:clock-in`, which is everyone.
- **My workday** (`workday-card`): the day's marks with their badges — manual, amended, voided —
  discrepancy chips, and an expandable revision history (previous time, who, why). A voided mark
  does not disappear: it is struck through.
- **Team register**: the same card per worker, for anyone with `bar:view-time-entries`, plus
  **Download CSV**. With `bar:manage-time-entries` the correct, void, add-mark and verify-integrity
  actions appear too.
- **Corrections**: bottom sheets (`time-entry-form`, `void-entry-form`) requiring a reason of at
  least 5 characters; the save button stays disabled without one.
- **Export**: opens a date-range picker preloaded with whatever period is on screen, so an
  inspection covering several months can be produced in one file.

The register follows the view: day, week or month, from the same selector already at the top of the
Shifts page.

**Clocking is only offered on today.** A clock-in always carries the server clock, so marking in the
past is impossible through the API anyway; showing the buttons on another day only invited people to
try. Earlier days are fixed with corrections and manual entries, which require a reason.

Geolocation is requested when clocking and is optional: if the browser denies it or takes longer
than 3 seconds, the mark is recorded without coordinates.

### Permissions, not roles

The shifts page does not look at `BarRole.OWNER` to decide what to show. Creating shifts, the weekly
replication block and the delete button are governed by `bar:create-shift` and `bar:delete-shift`.
Before that, a `MANAGER` had the permissions in the API but the interface hid the buttons.

## Backoffice auditing

`AuditTimeEntryChangedHandler` listens for `TimeEntryRecordedEvent`, `TimeEntryAmendedEvent` and
`TimeEntryVoidedEvent`, and only when the actor is a platform admin does it publish
`AdminActionEvent` with `TIME_ENTRY_CREATED`, `TIME_ENTRY_AMENDED` or `TIME_ENTRY_VOIDED`. An admin
clocking their own day does not clutter the panel log; an admin correcting somebody else's does.

## Not done

- **PDF export.** Only CSV today, which is enough to hand to an inspection since the regulation
  imposes no format.
