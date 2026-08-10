# Print bridge

A Go service installed on a computer at the venue that pushes tickets to the thermal printer,
whether it is connected over USB, network or Bluetooth.

How it fits the rest of the platform is in [printing bridge](../../docs/architecture/printing-bridge.md).

## How a ticket reaches the printer

The browser **cannot** talk to this service directly: the app is served over HTTPS and the bridge
only has an `http://` address on the local network, which every browser blocks as mixed content. So
the bridge calls outwards and is never called in:

```text
Waiter (app)  ──POST /bars/:id/printer/jobs──►  API  ──┐
                                                        │  queue in Postgres
Bridge (this service)  ──GET /printer/jobs/next─────────┘
        │  long-poll: the API holds the request open for up to 25s
        ▼
   Thermal printer
        │
        └──POST /printer/jobs/:id/result──►  API  ──►  the waiter sees whether it printed
```

Practical consequences: no router port to open, no firewall rule, and printing works from outside
the venue's wifi.

The local `POST /print` endpoint still exists for testing and as a LAN fallback, but it is **closed
by default**: it needs `-jwt-secret`, or `-insecure` to accept unauthenticated requests.

## Requirements

- Go 1.26 or newer (only to build).

## Setting up a venue

1. In the app, with printer management permission, generate the bar's **device key**. It is shown
   once; if it is lost, generate it again (the previous one stops working).
2. Start the bridge on the venue's computer:

```bash
./printer-service --bar-id=<BAR_ID> --device-key=<DEVICE_KEY> --print-width=48
```

Check it is alive:

```bash
curl http://localhost:8080/health
```

And what printers it can see (USB, serial, Bluetooth, and a scan of the local network for port
9100):

```bash
curl http://localhost:8080/printers
```

## Options

| Flag               | Default  | What it does                                                                        |
| ------------------ | -------- | ----------------------------------------------------------------------------------- |
| `-bar-id`          | —        | Which bar the bridge belongs to. Without it, it picks up no tickets.                 |
| `-device-key`      | —        | Key issued by the API. Also read from `PRINTER_DEVICE_KEY`.                           |
| `-printer-type`    | `usb`    | `usb` or `network`.                                                                  |
| `-printer-path`    | —        | Path (`/dev/usb/lp0`), Windows queue name, or `IP[:port]`. Empty means autodetect.   |
| `-print-width`     | `32`     | Characters per line: **32 for 58 mm paper, 48 for 80 mm**.                            |
| `-code-page`       | `cp858`  | Character table: `cp858`, `cp850`, `cp437`, `cp1252`.                                 |
| `-port`            | `8080`   | Local server port. Registered with the API alongside the IP.                          |
| `-jwt-secret`      | —        | Enables `POST /print`. Must match the API's `PRINTER_JWT_SECRET`.                     |
| `-insecure`        | `false`  | Opens `POST /print` with no authentication. Debugging only.                           |
| `-update-interval` | `6h`     | How often to check for a new version. `0` means only at startup.                      |
| `-local`           | `false`  | Points at `http://localhost:3000` instead of production.                              |

### Accents and the euro sign

Thermal printers are one byte per character. The service selects the table with `ESC t` and
transcodes the text: with the default (`cp858`), `ñ á é í ó ú ü ç` and `€` all come out right. If
your printer prints garbage where accents should be, try `-code-page=cp437` or `-code-page=cp850`.

## Development

```bash
go run ./cmd/server --local --insecure
go test ./...
```

## Publishing a new version

The version lives in **two places that have to match**, because the bridge refuses to retry an
update that did not take (otherwise it would loop downloading and restarting):

1. `internal/updater/version.go` → `CurrentVersion`
2. `apps/api/src/printer/services/printer-release.service.ts` → `PRINTER_BRIDGE_VERSION`

Bump both and build the binaries into the folder the API serves:

```bash
cd apps/printer-service
GOOS=linux GOARCH=amd64 go build -trimpath -ldflags="-s -w" -o ../api/public/downloads/printer-service-linux ./cmd/server
GOOS=windows GOARCH=amd64 go build -trimpath -ldflags="-s -w" -o ../api/public/downloads/printer-service-windows.exe ./cmd/server
```

Check the API advertises the right version and checksum:

```bash
curl "http://localhost:3000/api/v1/printer/check-version?os=linux"
```

The API computes the SHA-256 of the binary it has on disk and publishes it; the bridge **writes
nothing** that does not match that checksum, so a truncated download or an error page cannot replace
a working binary. If the binary is not published, `check-version` answers 400 rather than advertising
a URL that would 404.

In production `PUBLIC_URL` has to point at an address reachable from the venue; with the default
(`localhost`) no computer could download the update.

## Layout

- `cmd/server` — startup, routes and graceful shutdown.
- `internal/config` — flags, environment variables and validation.
- `internal/escpos` — ticket rendering, character tables and ESC/POS commands.
- `internal/infrastructure/printer` — USB/network/Windows drivers and discovery.
- `internal/relay` — the loop that collects tickets from the API.
- `internal/registration` — heartbeat carrying the bridge's IP and port.
- `internal/updater` — checksum-verified self-update.
