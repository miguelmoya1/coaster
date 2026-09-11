# Printing bridge

Tickets are printed by a small Go service (`apps/printer-service`) installed on a computer at the
venue. Its own operating manual is in [`apps/printer-service/readme.md`](../../apps/printer-service/readme.md);
this page covers how it fits the platform.

## Why a bridge at all

The browser **cannot** talk to a thermal printer, and it cannot talk to the bridge either: the app
is served over HTTPS while the bridge only has an `http://` address on the local network, which
every browser blocks as mixed content.

So the bridge calls outwards and is never called in:

```text
Waiter (app)  ──POST /establishments/:id/printer/jobs──►  API  ──┐
                                                        │  queue in Postgres (PrintJob)
Bridge  ──GET /printer/jobs/next────────────────────────┘
     │  long-poll: the API holds the request open for up to 25s
     ▼
Thermal printer
     │
     └──POST /printer/jobs/:id/result──►  API  ──►  the waiter sees whether it printed
```

Practical consequences: no router port to open, no firewall rule, and printing works from outside
the venue's wifi.

## Authentication

The bridge is not a user, so it does not carry an access token. Each venue has a **device key**
stored in `PrinterConfig`. The bridge sends it in the `X-Device-Key` header, and `DeviceKeyService`
compares it with `crypto.timingSafeEqual`.

That is why the printer controller is the one API controller without `AuthGuard`: it
authenticates per device, per establishment.

The long-poll endpoint is exempt from rate limiting — it deliberately holds a connection open and
reconnects immediately.

## Pairing

Nobody types a UUID onto a computer at a venue. The device key is delivered by the download itself:

```text
App    POST /establishments/:id/printer/pairing  ──►  an 8-character code, valid one hour, single use
       GET  /printer/download?os=&code=          ──►  coaster-printer-<CODE>.exe
Bridge (first run) reads the code out of its own filename
       POST /printer/pair { code }               ──►  { establishmentId, deviceKey }
       writes coaster-printer.json next to the executable
```

From then on the bridge reads that file at startup, so an update or a restart re-pairs nothing. The
code alphabet leaves out the characters people misread (`0`/`O`, `1`/`I`), because it is also
readable aloud over a phone.

`PrinterPairing` rows carry `expiresAt` and `redeemedAt`, so a code is spent the moment it is used
and expires on its own if it is not. `POST /printer/pair` is unauthenticated by necessity — the
bridge has no credential yet — so it is throttled to 10/minute and carries `@SkipSubscriptionCheck()`.

The device key can still be issued and rotated by hand from the app by someone with
`establishment:manage-printer` (`POST /establishments/:id/printer/device-key`); it is shown once, and
regenerating it stops the previous one immediately.

## Direct LAN printing

`GET /establishments/:establishmentId/printer/connection` returns the bridge's local address plus a short-lived JWT
signed with `PRINTER_JWT_SECRET`. The Go service verifies that token on its local `POST /print`
endpoint, checking both the signature and that the token was issued for its own establishment.

This path is a fallback for printing directly over the LAN; the normal route is the queue above.
The local endpoint is closed unless the bridge is started with `-jwt-secret` (or `-insecure`).

## Releases

`GET /printer/check-version` returns the current version, the download URL and the SHA-256 of the
binary, so a bridge can update itself and verify what it downloaded. The binaries are served from
`public/downloads/`, and `PUBLIC_URL` must be set or the API will advertise `localhost`, which no
venue can reach.

## Operational notes

- Rotate a venue's device key by regenerating it; the previous one stops working immediately.
- `PrintJob` rows carry status, attempts and the last error, and stale claims are requeued, so a
  bridge that dies mid-job does not swallow the ticket.
