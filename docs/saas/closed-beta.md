# Closed beta

While the beta is closed, only the addresses on the `BetaTester` table can open a **new** account.
Everyone who already has an account is untouched, and so is every other part of the product.

## Turning it on

Three things have to be true, in this order.

**1. The code is deployed.** The allowlist needs its table, and the table arrives with the migration
CI runs before the service starts. A push to `dev` does beta, a merge to `main` does production.

**2. Somebody is on the list.** Add yourself and your testers at `/admin/beta-testers` _before_
flipping the switch. An empty list plus the switch on means nobody new gets in, you included.

**3. The switch is on.**

```sh
gcloud run services update api-beta --region europe-west1 \
  --update-env-vars BETA_ALLOWLIST_ENABLED=true
```

`--update-env-vars` touches only that variable, and CI deploys with `--update-env-vars` too, so the
switch survives every later push. It is not baked into the image: no rebuild, no redeploy, the new
revision starts within seconds.

Nothing has to change on the web side beyond having the same commit deployed — Vercel builds `dev`
for `beta.coaster.business` on its own.

## The switch

`BETA_ALLOWLIST_ENABLED=true` on the API turns it on. Anything else — `false`, empty, absent — and
sign-up behaves exactly as it did before the allowlist existed. The default is open, so a fresh
environment that never sets the variable will not lock anybody out.

When the flag is on, the API says so once at boot, at `warn` level so it survives the production log
filter:

```
Beta allowlist is ON: only emails on the BetaTester table can open a new account
```

## Where the check lives

`SyncUserHandler` is the only place a `User` row is born, so it is the only place that asks. The
check sits on the branch that creates a brand new user, which means:

- An address on the list signs in and gets an account.
- An address that is not on the list is refused with `403 BETA_ACCESS_REQUIRED`, **and no row is
  written** — the database does not fill up with people who bounced off the door.
- Someone an owner invited to their venue already has a row waiting for them, so they never reach
  the check. Testers can staff their own venues without going through you.

The screen stays available whether the switch is on or off, and says which. Hiding it while the
allowlist is idle would be a trap: you would have no way to fill the list before turning the switch
on, and turning it on against an empty list locks out everybody, you included.

## Two different questions

| Question                                   | Where it is answered                                   |
| ------------------------------------------ | ------------------------------------------------------ |
| May this person open an account?           | `BetaTester` — the allowlist, at `/admin/beta-testers` |
| May this person use the product right now? | `User.active` — at `/admin/users`                      |

Taking somebody off the allowlist does not touch an account they already opened. To cut off someone
who is already in, deactivate them under Users.

## Opening the beta

Set `BETA_ALLOWLIST_ENABLED=false` (or drop the variable) and redeploy. No migration, no code
change, no data change. The table can stay where it is; to be rid of it entirely, delete the check
in `SyncUserHandler` and drop `BetaTester`.

## Closing a beta that was open

[`close-the-beta.sql`](close-the-beta.sql) seeds the allowlist and deactivates everyone else. It
keeps the employees of an allowlisted owner, since deactivating them would break the very venues you
are keeping. Run its `SELECT`s before its `UPDATE`.
