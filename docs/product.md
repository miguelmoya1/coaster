# The product

Coaster is an operational tool for small hospitality businesses — bars, restaurants and cafes. It
covers the floor (tables, orders, payments) and the back office (staff, rota, stock), so a venue can
run its day without WhatsApp groups and paper.

It is sold as a SaaS: each venue subscribes to a plan, and the platform is operated from an internal
admin backoffice. It is currently in **closed beta** — while `BETA_ALLOWLIST_ENABLED` is on, only
addresses on the allowlist can open a new account, and people invited to an existing venue are
unaffected. See [closed beta](saas/closed-beta.md).

## What it does

### Floor (orders and tables)

- **Tables:** open, occupy and free tables; move an order between tables; merge orders.
- **Orders:** add items, track what has been served and what has been paid, line by line.
- **Payments:** cash, card or split; partial payments, tips and per-order or per-item adjustments.
- **Receipts:** print to a local thermal printer through the [printer bridge](architecture/printing-bridge.md).

### Schedule

- **Multi-view calendar:** daily, weekly and monthly shift views.
- **Shift assignment:** owners and managers create shifts and assign them to staff.
- **Shift marketplace:** staff can drop a shift for someone else to pick up.
- **Staff management:** three roles per venue — `OWNER`, `MANAGER` and `STAFF`.

### Time tracking (the legal working-time register)

The register required by art. 34.9 of the Spanish Workers' Statute: append-only marks enforced by
database triggers, corrections that never overwrite the original and carry who/when/what/why, a
per-establishment hash chain, CSV export over any date range for labour inspections, and the rota
contrasted against what was actually worked. See [time tracking](operations/time-tracking.md).

### Inventory

- **Visual catalog:** large icons for fast use on touch screens.
- **Traffic light system:** stock state at a glance — OK, low, or out.
- **Smart ordering:** groups missing items into a message ready to send to a supplier.
- **Starter catalogue:** a venue that opens on Monday does not start with an empty screen. Coaster
  ships a catalogue in the repository and imports it in the establishment's language, as words —
  see [catalogue and menu](architecture/catalogue-and-menu.md).
- **Allergens:** the fourteen Spanish law obliges a venue to declare, on the product itself.

### Public menu

A menu customers read from a QR code, at `/m/:slug` — its own document, not a view over the
catalogue, with its own translations and its own prices. Publishing renders it once into a snapshot,
so the public page is one column read with no joins and nothing to invalidate. Off until somebody
turns it on, and never showing stock, takings or staff.

### Assistant

An in-app assistant, by text or by voice, that reads the venue's live state and executes actions on
it. Every one of its tools dispatches the same command an HTTP route would and checks the same
permission first, so it can never do more than the caller can. See
[the assistant](architecture/assistant.md).

### Admin backoffice

Platform operations at `/admin`, for users with the `ADMIN` role: metrics, venue and user
management, granting PRO by hand without Stripe, the beta allowlist, and an audit log of every action
taken. See [backoffice](admin/backoffice.md).

### Real time

Live updates over Server-Sent Events: orders, tables, stock, members and subscription changes
propagate to everyone watching the venue. One authenticated `GET` per client, the same guards as
every other endpoint. A reconnect replays a two-minute buffer, so nothing is missed across a tunnel
or a screen lock.

## One product, three modules

Not every venue sells at a till, and none of them should pay in screen space for what they do not
do. An establishment picks a business type at onboarding, and that turns on modules:

| Module          | Turns on                              | Hospitality | Retail | Other |
| --------------- | ------------------------------------- | :---------: | :----: | :---: |
| `TIME_TRACKING` | clocking and the legal register       |      ✓      |   ✓    |   ✓   |
| `ORDERS`        | tables, orders, payments, the printer |      ✓      |        |       |
| `INVENTORY`     | catalogue, stock, the public menu     |      ✓      |   ✓    |       |

It is enforced, not merely hidden: `middleware.Modules` answers `403 MODULE_NOT_ENABLED` on
the API, `moduleGuard` blocks the route in the browser, and the assistant is not even offered the
tools. Changing it later is the owner's call, under **Settings**.

## Access model

Four independent axes, all of which a request must pass:

| Axis           | Values                                 |
| -------------- | -------------------------------------- |
| Platform role  | `USER`, `ADMIN`                        |
| Venue role     | `OWNER`, `MANAGER`, `STAFF`            |
| Subscription   | Stripe, manual grant, none             |
| Enabled module | `TIME_TRACKING`, `ORDERS`, `INVENTORY` |

An unpaid venue keeps **read** access to its history — it only loses writes. And it never loses the
working-time register: clocking in is registered with `middleware.SkipSubscriptionCheck()`, because the legal obligation
does not depend on the invoice being paid. Full detail in [access model](architecture/permissions.md).
