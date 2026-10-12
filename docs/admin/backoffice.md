# Admin backoffice

Internal panel at `/admin`, for users with `User.role = ADMIN` only. It exists so the platform can be
operated without opening the database by hand.

The full access story is in [access model](../architecture/permissions.md).

## Sections

| Route                   | For what                                                                       |
| ----------------------- | ------------------------------------------------------------------------------ |
| `/admin/overview`       | Establishments, users, how many have access and by which route, 30-day billing |
| `/admin/establishments` | Searchable list with filters; detail page with plan and team actions           |
| `/admin/users`          | Find people, promote or demote admins, activate and deactivate                 |
| `/admin/beta-testers`   | The sign-up allowlist while the beta is closed                                 |
| `/admin/audit`          | Everything done from the panel                                                 |

`/admin/beta-testers` stays visible whether `BETA_ALLOWLIST_ENABLED` is on or off, and says which.
Hiding it while the allowlist is idle would be a trap: there would be no way to fill the list before
turning the switch on, and turning it on against an empty list locks out everybody, you included.
See [closed beta](../saas/closed-beta.md).

The starter catalogue an establishment can import is no longer edited here: it ships with the API as
`starterCatalogue` in [`catalogue.go`](../../apps/api/internal/core/domain/catalogue.go), so changing it is a
reviewed commit rather than a paste into production. See
[catalogue and menu](../architecture/catalogue-and-menu.md).

## Granting PRO without Stripe

From an establishment's detail page: **Grant PRO**, with a duration (7, 30, 90, 365 days or indefinite) and an
optional reason.

It writes to the `manual*` columns on `EstablishmentSubscription` without touching the Stripe ones.
Consequences:

- The establishment writes normally even with no Stripe subscription or customer.
- A later webhook updates billing without erasing the grant.
- Revoking it drops the establishment back to whatever Stripe says; if nothing there is live, it becomes read
  only.
- An expired grant is equivalent to no grant: there is nothing to clean up.

Revoking requires a grant to exist; otherwise it answers `NO_MANUAL_GRANT` rather than faking success
against a Stripe subscription the panel does not manage.

Granting and revoking both publish `SubscriptionOverriddenEvent`, which goes out over the realtime
stream as `subscriptionUpdated`, so that establishment's clients refresh immediately.

## Billing source

Each establishment falls into one of three states, mutually exclusive and in this order of priority:

- **MANUAL** — a live admin grant.
- **STRIPE** — a live Stripe subscription with no grant on top.
- **NONE** — neither: the establishment is read only.

The calculation (`AdminEstablishmentRow.Summary`, in `core/domain/admin.go`) is made of the same two
checks as `domain.SubscriptionGrantsAccess`, which the guard's subscription step uses —
`IsManualGrantActive` and the Stripe half — so the panel never shows access the API is about to
refuse.

## Rules the panel will not let you break

- You cannot edit your own admin account: it would take effect on the next request and leave no
  screen from which to undo it.
- You cannot demote or deactivate the last active admin.
- You cannot leave an establishment without an `OWNER`.
- Destructive actions (deleting establishments or users) do not exist yet, by explicit decision.

## Auditing

Every action writes the actor, the action, the target, the reason and a `metadata` with before and
after into `AdminAuditLog`. It is visible at `/admin/audit` and, filtered, on each establishment and user page.

Recorded actions: `ESTABLISHMENT_PLAN_GRANTED`, `ESTABLISHMENT_PLAN_REVOKED`, `ESTABLISHMENT_RENAMED`, `ESTABLISHMENT_MEMBER_ROLE_CHANGED`,
`USER_ROLE_CHANGED`, `USER_ACTIVATION_CHANGED`, `TIME_ENTRY_CREATED`, `TIME_ENTRY_AMENDED`,
`TIME_ENTRY_VOIDED`.

### How it is recorded

No service writes to the audit repository directly. They all publish **a single event**,
`AdminActionEvent`, carrying the entry already assembled; `AdminAuditService.recordAction` is the
only subscriber and the only writer.

```text
admin_*_service.go ───────────────────────────────┐
MemberRoleChangedEvent (when the actor is ADMIN) ─┼─► AdminActionEvent ─► AdminAuditService ─► AdminAuditLog
TimeEntry*Event (when the actor is ADMIN) ────────┘
```

One event per action would have meant several identical subscribers: the audit entry already has the
same shape for all of them, so the event carries it as is.

Two consequences worth keeping in mind:

- Recording is **asynchronous**: `event.Bus` runs the subscriber on its own goroutine, and the write
  never shares a transaction with the action. A failure does not break the request: it is logged as
  an error with which action went unaudited.
- `ESTABLISHMENT_MEMBER_ROLE_CHANGED` does not come from a backoffice route. The panel changes roles with the
  same `PATCH /establishments/{establishmentId}/members/{memberId}` an owner uses, and the entry is written only when the
  actor is an `ADMIN`.

## Code layout

Same split as everywhere else (see the [API structure](../apps/api/estructura.md) and
[frontend](../architecture/frontend.md)):

```text
apps/api/internal/               admin_*_handler.go, admin_*_service.go, admin_*_repository.go
apps/web/src/app/admin/                 domain: HTTP repository, signal stores, mappers
apps/web/src/app/presentation/admin/    layout, pages and components
```

The API exposes everything under `/api/v1/admin`. Every admin route is registered with
`middleware.Admin()` and `middleware.SkipSubscriptionCheck()`: the establishment routes have an
`establishmentId`, and without the skip the subscription rule would block writes on exactly the
lapsed establishments the admin came to fix.

`TestAdminRoutesAreForPlatformAdmins` calls each route of its `adminRoutes` list without a session
and as a user who is not a platform admin, and fails unless both are refused — the panel's routes are
the ones where a missing rule costs the most, so a new one goes on that list.
