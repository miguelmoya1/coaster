# Print bridge (servicio de impresión)

Servicio en Go que se instala en un ordenador del bar y saca los tickets por la impresora
térmica, ya esté conectada por USB, por red o por Bluetooth.

## Cómo llega un ticket a la impresora

El navegador **no puede** hablar directamente con este servicio: la app se sirve por HTTPS y el
bridge solo tiene una dirección `http://` en la red local, lo que todos los navegadores bloquean
como *mixed content*. Por eso el bridge llama hacia fuera y nunca al revés:

```
Camarero (app)  ──POST /bars/:id/printer/jobs──►  API  ──┐
                                                          │  cola en Postgres
Bridge (este servicio)  ──GET /printer/jobs/next──────────┘
        │  (long-poll: la API mantiene abierta la petición hasta 25s)
        ▼
   Impresora térmica
        │
        └──POST /printer/jobs/:id/result──►  API  ──►  el camarero ve si salió el ticket
```

Consecuencias prácticas: no hay que abrir ningún puerto en el router, no hace falta regla de
firewall, y se puede imprimir desde fuera del wifi del bar.

El endpoint local `POST /print` sigue existiendo para pruebas y como respaldo en la LAN, pero
está **cerrado por defecto**: necesita `-jwt-secret`, o `-insecure` para aceptar peticiones sin
autenticar.

## Requisitos

- Go 1.26 o superior (solo para compilar).

## Puesta en marcha en un bar

1. En la app, con permiso de gestión de impresora, genera la **device key** del bar.
   Se muestra una sola vez; si se pierde, vuelve a generarla (la anterior deja de valer).
2. Arranca el bridge en el ordenador del bar:

```bash
./printer-service --bar-id=<ID_DEL_BAR> --device-key=<DEVICE_KEY> --print-width=48
```

Comprueba que está vivo:

```bash
curl http://localhost:8080/health
```

Y qué impresoras ve (USB, serie, Bluetooth y barrido de la red local buscando el puerto 9100):

```bash
curl http://localhost:8080/printers
```

## Opciones

| Flag | Por defecto | Para qué sirve |
| --- | --- | --- |
| `-bar-id` | — | Bar al que pertenece el bridge. Sin él no recoge tickets de la cola. |
| `-device-key` | — | Clave que emite la API. También por env `PRINTER_DEVICE_KEY`. |
| `-printer-type` | `usb` | `usb` o `network`. |
| `-printer-path` | — | Ruta (`/dev/usb/lp0`), nombre de cola de Windows, o `IP[:puerto]`. Vacío = autodetección. |
| `-print-width` | `32` | Caracteres por línea: **32 para papel de 58 mm, 48 para 80 mm**. |
| `-code-page` | `cp858` | Tabla de caracteres: `cp858`, `cp850`, `cp437`, `cp1252`. |
| `-port` | `8080` | Puerto del servidor local. Se registra en la API junto con la IP. |
| `-jwt-secret` | — | Habilita `POST /print`. Debe coincidir con `PRINTER_JWT_SECRET` de la API. |
| `-insecure` | `false` | Abre `POST /print` sin autenticación. Solo para depurar. |
| `-update-interval` | `6h` | Cada cuánto busca versión nueva. `0` = solo al arrancar. |
| `-local` | `false` | Apunta a `http://localhost:3000` en vez de a producción. |

### Acentos y euro

Las impresoras térmicas son de un byte por carácter. El servicio selecciona la tabla con `ESC t`
y transcodifica el texto: con el valor por defecto (`cp858`) salen bien `ñ á é í ó ú ü ç` y `€`.
Si tu impresora imprime basura donde hay acentos, prueba `-code-page=cp437` o `-code-page=cp850`.

## Desarrollo

```bash
go run ./cmd/server --local --insecure
go test ./...
```

## Publicar una versión nueva

La versión está en **dos sitios que tienen que coincidir**, porque el bridge se niega a reintentar
una actualización que no cuajó (si no, entraría en bucle de descarga y reinicio):

1. `internal/updater/version.go` → `CurrentVersion`
2. `apps/api/src/printer/services/printer-release.service.ts` → `PRINTER_BRIDGE_VERSION`

Sube ambas y compila los binarios en la carpeta que sirve la API:

```bash
cd apps/printer-service
GOOS=linux GOARCH=amd64 go build -trimpath -ldflags="-s -w" -o ../api/public/downloads/printer-service-linux ./cmd/server
GOOS=windows GOARCH=amd64 go build -trimpath -ldflags="-s -w" -o ../api/public/downloads/printer-service-windows.exe ./cmd/server
```

Comprueba que la API anuncia la versión y el checksum correctos:

```bash
curl "http://localhost:3000/api/v1/printer/check-version?os=linux"
```

La API calcula el SHA-256 del binario que tiene en disco y lo publica; el bridge **no escribe
nada** que no cuadre con ese checksum, así que una descarga cortada o una página de error no
pueden reemplazar un binario que funciona. Si el binario no está publicado, `check-version`
responde 400 en vez de anunciar una URL que daría 404.

En producción `PUBLIC_URL` tiene que apuntar a una dirección alcanzable desde el bar; con el
valor por defecto (`localhost`) ningún ordenador podría descargar la actualización.

## Estructura

- `cmd/server` — arranque, rutas y apagado ordenado.
- `internal/config` — flags, variables de entorno y validación.
- `internal/escpos` — render del ticket, tablas de caracteres y comandos ESC/POS.
- `internal/infrastructure/printer` — drivers USB/red/Windows y descubrimiento.
- `internal/relay` — bucle que recoge tickets de la API.
- `internal/registration` — latido con la IP y el puerto del bridge.
- `internal/updater` — auto-actualización verificada por checksum.
