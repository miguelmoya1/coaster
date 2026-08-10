# Access model

Who can do what in Coaster is decided on **three independent axes**. A request has to clear all
three.

| Axis          | Question                          | Values                            | Where it lives    |
| ------------- | --------------------------------- | --------------------------------- | ----------------- |
| Platform role | Who you are in Coaster            | `USER`, `ADMIN`                   | `User.role`       |
| Bar role      | What you are inside **that** bar  | `OWNER`, `MANAGER`, `STAFF`       | `BarMember.role`  |
| Access state  | Whether that bar's service is live | Stripe, manual grant, neither     | `BarSubscription` |

They are orthogonal: a platform `ADMIN` is not a member of any bar, and a bar `OWNER` has no power
over the platform.

## The permission table

`packages/common/src/domain/permissions/bar-permissions.ts` is the **only** source of truth. Both
the API and the web app import it **directly from `@coaster/common`**; nothing re-exports it from a
`core`, so there is no second route to reach it.

It used to be duplicated on both sides and drifted: the web copy was missing `bar:view-printer` and
`bar:manage-printer`, so the UI hid actions the API happily allowed. That is why it lives in
`common` now.

`hasPermission(role, permission)` is the function that decides. `OWNER` short-circuits to `true`: it
has everything by definition.

`getRolePermissions(role)` **decides nothing**. It only describes: it fills `BarMember.permissions`
in the payload and tells the AI assistant what the caller may do. Real authorisation is always
`hasPermission`.

Because `hasPermission` short-circuits but `getRolePermissions` has to enumerate, the two can drift.
`OWNER`'s list is built as `MANAGER + OWNER_ONLY_PERMISSIONS`, and a test asserts it equals every
declared `BarPermission`. Add a permission and forget to place it, and the test fails instead of the
AI being quietly told the owner cannot do something.

Hierarchy, verified in `bar-permissions.spec.ts`: `STAFF ⊂ MANAGER ⊂ OWNER`.

- **STAFF**: works the floor. Orders, payments, tables, stock, their own shifts and exchanges,
  clocking their own day (`bar:clock-in`) and correcting their own marks with a reason
  (`bar:amend-own-time-entry`; the handler checks the mark actually belongs to them).
- **MANAGER**: everything STAFF has, plus the menu, inviting members, other people's shifts, the
  printer and the team's time register (`bar:view-time-entries`, `bar:manage-time-entries`).
- **OWNER**: everything, including billing, removing members and **changing anyone's role**.

`bar:update-member-role` is OWNER-only: a manager runs the day to day but does not hand out power,
the same way they cannot remove anyone or touch billing.

Inviting is the one place where that boundary needs help from a handler. `bar:invite-member` is a
manager permission, but the invite carries the role to grant — so on its own the guard would let a
manager invite themselves back as an OWNER. `InviteMemberHandler` refuses to grant `OWNER` unless
the inviter is an owner of that bar or a platform admin.

Changing a role has **one route**: `PATCH /bars/:barId/members/:memberId`. The backoffice does not
have its own: `BarPermissionsGuard` already lets an `ADMIN` through before checking membership, so
an admin uses exactly the same endpoint an owner does.

Auditing does not suffer for it: `UpdateMemberRoleCommand` publishes `MemberRoleChangedEvent`
carrying the actor and their platform role, and the `admin` module listens and **records only when
the actor was `ADMIN`**. The "never leave a bar without an OWNER" rule lives in one place, and the
audit entry hangs off a fact rather than a parallel route.

## The four guards

Order matters. Nest runs **global guards before** controller-scoped ones.

### 1. `SubscriptionActiveGuard` (global, `APP_GUARD`)

Decides whether the bar's service is live. It lets through, in this order:

1. `GET`, `HEAD` and `OPTIONS` **always**. This is deliberate: a venue that stops paying keeps read
   access to its own history, because it may be legally required to produce it. It only loses
   writes.
2. Routes marked `@SkipSubscriptionCheck()`.
3. The subscription-management routes themselves, or you could never pay to restore access.
4. Requests with no `barId`.
5. A live manual grant (see below). **Checked before Stripe.**
6. Stripe: a paid period in progress, a trial in progress, or a cancellation that has not reached
   its end date.
7. As a last resort, if the caller is a platform `ADMIN`.

If nothing applies it answers **402** with `SUBSCRIPTION_EXPIRED` and the front end opens the plan
dialog.

Because this guard runs before `FirebaseAuthGuard`, at step 7 there is no `request.user` yet: it
resolves identity by reading the bearer token itself, through `FirebaseTokenService`. It only does
so once it has already decided to reject, so a normal request never pays that cost.

### 2. `FirebaseAuthGuard` — identity

Verifies the token with Firebase, finds the local user by `googleId` and **rejects when
`user.active` is `false`**. That check is what makes the backoffice deactivate button real; without
it a deactivated user kept full access. The same rule applies over websockets (`WsAuthService`).

### 3. `AdminGuard` — platform role

Requires `User.role === ADMIN`. It **fails closed**: a route that carries the guard but forgets
`@Admin()` is still denied. Opting out is explicit and has to be written as `@Admin(false)`.

It used to fail open — no decorator meant the guard returned `true` and protected nothing — which
made every one of the backoffice routes depend on a decorator nobody could forget.
`admin-controllers.security.spec.ts` still walks `AdminControllers` and fails if a controller loses
its `@Admin()`, its guards, or their order.

### 4. `BarPermissionsGuard` — membership and permission

1. If the caller is a platform `ADMIN`, they pass **without a membership check**.
2. Otherwise, an active membership in that bar is required.
3. If the route declares `@BarPermissions(...)`, every one of those permissions is required via
   `hasPermission`.

A route with a `barId` but no `@BarPermissions` only requires belonging to the bar.

Membership lookups filter `deletedAt: null`. Removing a member is a soft delete, so without that
filter the guard kept honouring the membership of somebody who had been removed — they stayed out of
the members list while keeping their full role. The same filter belongs in every path that answers
"is this person still in this bar": the HTTP guard, `WsAuthService`, the AI handler and the bar
list.

Removal also pushes the member out of the bar's live websocket room, so they stop receiving
real-time data before their next request is refused.

## The platform admin

An `ADMIN` walks into any bar with `OWNER` powers without being a member. Three points make that
work and have to be read together:

| Point                      | What it does                                                       |
| -------------------------- | ------------------------------------------------------------------ |
| `BarPermissionsGuard`      | Lets them through before checking membership                       |
| `SubscriptionActiveGuard`  | Lets them write even when the bar has not paid                     |
| `GetMemberMeHandler`       | Returns a synthetic `OWNER` membership when they are not a member  |

The third is what makes the **UI** work: without it the API would allow everything while the front
end hid the buttons, because `MyMemberStore` would have no role to derive permissions from.

## Manual plan grants

An admin can give a bar PRO without going through Stripe. It lives in its own columns on
`BarSubscription`, **separate from the Stripe ones**:

```text
manualPlan            granted plan (PRO only; FREE grants nothing)
manualGrantExpiresAt  null = no expiry
manualGrantReason     internal admin note
manualGrantedById     which admin granted it
manualGrantedAt       when
```

Keeping them separate is what lets a later Stripe webhook update billing **without clobbering the
grant**, and lets revoking it drop the bar cleanly back to whatever Stripe says.

`isManualGrantActive()` is the only function that decides whether a grant is still live, and the
guard, the mapper and the backoffice all use it so they cannot disagree.

### What is visible, and to whom

`GET /bars/:barId/bar-subscription` can be called by any member of the bar. That is why the same
data has two shapes:

- `toDomain()` — workspace payload. Only `plan` and `expiresAt`: enough for the UI not to lock.
- `toAdminDomain()` — backoffice only. Adds the reason, who granted it and when.

The admin's internal note must not reach the venue. `bar-subscription.mapper.spec.ts` pins this by
serialising the public payload and asserting it contains neither the reason nor the admin's name.

## Auditing

Every backoffice action lands in `AdminAuditLog`: who, what, on what, when and why. It is the
counterweight to an admin being able to step over every barrier above.

## Account identity

A user record can exist before its owner ever signs in — that is how invitations work: the invite
creates a user by email with no `googleId`, and the invited person claims it when they first sign
in with Google.

Claiming is the sensitive step, so it has two conditions. The token must vouch for the address
(`email_verified`), and the account must not already be linked to a different sign-in
(`googleId === null`). Without the first, enabling any provider that does not verify emails would
turn account takeover into a sign-up form; without the second, a second Google account on the same
address would silently take the record over.
