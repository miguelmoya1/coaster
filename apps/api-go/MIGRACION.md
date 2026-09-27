# Migración de `apps/api` (NestJS) a `apps/api-go`

Plan para reescribir la API de coaster en Go con la estructura de `ESTRUCTURA.md`.
Las librerías están en `LIBRERIAS.md`.

## Objetivos

1. **Aprender Go** con un proyecto real.
2. **Ahorrar costes** en Cloud Run: menos instancias gracias a más concurrencia y al uso de
   varios núcleos, arranques en frío casi instantáneos y posibilidad de funcionar sin Redis
   mientras baste con una sola instancia.

El rendimiento **no** es el motivo. Casi toda la latencia de la API viene de Postgres.

## Decisiones tomadas

- **Sin CQRS.** Un servicio por entidad y un método por caso de uso. Los command/query
  handlers de Nest se convierten en métodos del servicio.
- **Los efectos secundarios van por eventos.** Hablamos del realtime, la auditoría y la
  invalidación de caché. Hay una interfaz `EventPublisher` en `ports/` y cada suscriptor se
  ejecuta en su goroutine. Solo se publica después de guardar en la base de datos.
- **Interfaces solo para lo que el servicio necesita de fuera**: repositorios, servicios
  externos y `EventPublisher`. Los servicios no tienen interfaz; los handlers reciben el
  struct concreto.
- **Las transacciones viven dentro del repositorio**, igual que en `apps/api`, donde los 14
  archivos que usan `$transaction` son repositorios. No hay `TxManager` ni `UnitOfWork`.
- **SQL a mano, un archivo `.sql` por consulta**, incrustado con `go:embed` (ver
  `ESTRUCTURA.md`). Sin ORM y sin sqlc por ahora.
- **Prisma sigue siendo dueño del esquema hasta P5.** Mientras Nest esté en producción, las
  migraciones se escriben en Prisma. Los tests de Go aplican las `migration.sql` de
  `apps/api/prisma/migrations` en orden. goose entra en P5, con una migración base sacada
  del esquema de ese momento.
- **Sin log de peticiones ni ruta de salud.** Cloud Run ya registra cada petición y comprueba
  el puerto, y Nest no tiene ninguna de las dos. `slog` se usa para errores.
- **Validación casi idéntica.** Mismo formato (`message: string[]`), mismos textos y los
  campos desconocidos primero. class-validator devuelve todas las reglas que fallan en cada
  campo y validator solo la primera, así que el orden del array puede cambiar. Los e2e no
  comprueban esos textos.
- **Consultas simples.** La API actual casi no anida relaciones: son includes de un solo
  nivel, como `preferences`, `adjustments` o `items` con `product`. Cuando haga falta, se
  hacen dos consultas y se juntan en Go.
- **El código lo escribe la IA** y se revisa fase a fase.

## Cómo encaja la API actual

```
internal/
├── core/domain/        order.go, product.go, … (~20 archivos, uno por módulo de Nest)
├── core/ports/         repositorios, servicios externos y events.go
├── service/            order_service.go, …
└── adapter/
    ├── handler/http/   order_handler.go, … + sse_handler.go
    ├── handler/middleware/  auth, permisos, módulos, suscripción, admin, rate limit, CORS…
    ├── repository/     *_repository.go + queries/<entidad>/*.sql
    ├── cache/          Redis (caché, bus de realtime, replay, rate limit)
    ├── payment/        Stripe
    ├── email/          Resend + plantillas
    ├── storage/        GCS (URLs firmadas)
    └── ai/             AI Gateway + herramientas
```

| En Nest | En Go |
|---|---|
| Módulo (`src/orders/`) | Un archivo en cada capa: `domain/order.go`, `ports/order.go`, `service/order_service.go`, `repository/order_repository.go`, `handler/http/order_handler.go` |
| Controller | Handler HTTP |
| Command/Query handler | Método del servicio |
| Event handler | Suscriptor del `EventPublisher` |
| Guard | Middleware |
| DTO con class-validator | Struct con tags de `validator` |
| Repositorio de Prisma | Repositorio con pgx y archivos `.sql` |
| `core/security` | `handler/middleware/` + `service/` (tokens y sesiones) |

## Tamaño de lo que hay que migrar

Datos medidos en `apps/api`:

| | Tamaño |
|---|---|
| Código propio (sin el cliente generado de Prisma) | ~21.600 líneas de TS en 24 módulos |
| Endpoints | ~124 |
| Modelos | 32, con 48 migraciones |
| Llamadas a Prisma | ~325, con 22 transacciones y 3 SQL a mano (`FOR UPDATE`, advisory lock) |
| Tests | 17.700 líneas unitarias + 5.800 e2e (32 archivos) |

## Paquetes de trabajo

El código lo escriben agentes en paralelo, así que no se estima en semanas-persona. Lo que
marca el ritmo es lo que **no** se comprime: la revisión (que además es el aprendizaje) y
lo que depende de terceros.

```
P0 Base ──► P1 Auth y permisos ──┬──► P2a Catálogo ──────┐
   │                             ├──► P2b Local y personas│
   │                             ├──► P2c Turnos y fichajes├──► P3 IA ──► P5 Salida
   │                             ├──► P2d Pedidos ─────────┘              ▲
   │                             ├──► P2e Cobros                          │
   │                             └──► P2f Realtime                        │
   └──► P4 Arnés e2e contra Go ──────────────────────────────────────────┘
```

| Paquete | Contenido | Depende de |
|---|---|---|
| P0 Base | `go.mod`, config, pool de pgx, arnés de tests con Postgres, router, formato de respuestas y errores **idéntico a Nest**, validación, middlewares de recovery/CORS/cabeceras/compresión, `EventPublisher`, Dockerfile, compose y CI | — |
| P1 Auth y permisos | JWT, sesiones con rotación de refresh tokens, Google, argon2, tokens de email, middlewares de auth/permisos/módulos/suscripción/admin, rate limit | P0 |
| P2a Catálogo | Categorías, productos, catálogo inicial, carta pública, media (GCS) | P1 |
| P2b Local y personas | Locales, miembros e invitaciones, usuarios, admin | P1 |
| P2c Turnos y fichajes | Turnos, intercambios, fichajes (advisory lock, triggers) | P1 |
| P2d Pedidos | Pedidos (`FOR UPDATE`), mesas, cierres de caja, estadísticas, impresoras | P1 |
| P2e Cobros | Stripe, suscripciones, webhooks, emails (Resend) | P1 |
| P2f Realtime | SSE, bus en Redis, replay, suscriptores de eventos | P1 |
| P3 IA | AI Gateway, bucle de herramientas, cuota | P2a, P2b, P2c, P2d (sus herramientas usan miembros, pedidos, mesas y estadísticas) |
| P4 Arnés e2e | Adaptar los e2e de `apps/api` para lanzarlos también contra Go, y un job de CI que lo haga | P0 |
| P5 Salida | Paridad completa, migración base de goose, infraestructura, beta en paralelo, cambio en producción | Todo |

Los seis paquetes P2 pueden ir a la vez. El volumen esperado son ~15–20k líneas de Go y
~12–18k de tests.

### Lo que comprime

- Todo P0, P2 y P4: es código mecánico que sigue un patrón y se comprueba en local.
- Los tests de cada paquete.

### Lo que no comprime

- **Tu revisión** de cada paquete. Es el objetivo de aprender, así que no conviene saltársela.
- **Probar argon2 con un hash real** de la base de datos antes de P5. En P1 basta con un
  test que verifique hashes generados por `@node-rs/argon2` con los mismos parámetros.
- **Confirmar los modelos de respaldo del AI Gateway** sin el SDK de Vercel (P3).
- **Stripe en modo test**: dar de alta el endpoint del webhook de Go en el panel de Stripe (P2e).
- **Infraestructura**: servicio nuevo en Cloud Run y job de migraciones (P5).
- **Beta con uso real** antes de pasar a producción (P5).

Una alternativa para empezar con poco riesgo: sacar **P2f Realtime como servicio aparte**
nada más terminar P0 y la parte de JWT de P1. Se suscribe al mismo canal de Redis
(`coaster:realtime`) que publica Nest, verifica el JWT con el mismo secreto y comprueba que
el usuario es miembro del local.

## Estado

Actualizar esta tabla al terminar cada paquete.

| Paquete | Estado | Notas |
|---|---|---|
| Documentación y estructura de carpetas | ✅ Hecho | `ESTRUCTURA.md`, `LIBRERIAS.md`, este archivo y `.gitkeep` en cada carpeta |
| Revisión de `LIBRERIAS.md` | ✅ Hecho | 27-sep-2026. Solo quedan por confirmar los modelos de respaldo de la IA (P3) |
| P0 Base | ✅ Hecho | Esqueleto, config, pool y arnés de Postgres, contrato HTTP de Nest (errores, 404, validación), helmet, CORS, gzip, `/public/`, `EventPublisher` en memoria, Dockerfile, servicio `api-go` en compose y job de CI |
| P1 Auth y permisos | ✅ Hecho | `/auth` y `/account` completos (registro, login, Google, refresh con rotación y detección de reutilización, recuperación, verificación, invitaciones, sesiones, identidades), JWT, argon2 compatible con `@node-rs/argon2`, guard de rutas (rate limit, suscripción, auth, admin, permisos, módulos), caché y rate limit en Redis con respaldo en memoria, bloqueo de login, Have I Been Pwned, email a log o al buzón de test. `test/auth` pasa contra Go; `test/permissions` y `test/modules` esperan a las rutas de P2. Faltan: el refresco de la suscripción desde Stripe (`SubscriptionRefresher`, P2e) y Resend (P2e) |
| P2a Catálogo | ✅ Hecho | Categorías, productos (con `AdjustStock` para pedidos e IA), catálogo inicial, carta (borrador, publicar, carta pública por `slug` con `lang` y agotados) y URLs firmadas de subida a GCS (`adapter/storage`, cliente perezoso). Eventos `Category*`, `Product*` y `CatalogueImportedEvent` con su suscriptor de realtime. `test/categories`, `test/products`, `test/catalogue` y `test/menu` pasan contra Go |
| P2b-1 Locales y usuarios | ⏳ En marcha | Ola 3b. `establishments` y `users`. `test/establishments` y `test/users` |
| P2b-2 Miembros e invitaciones | ⏳ En marcha | Ola 3b. `establishment-members` y el cableado de `SyncSeatsOnMemberChange`. `test/establishment-members` (`access-revocation` necesita P2d-1) |
| P2b-3 Admin | ⏳ En marcha | Ola 3b. `admin`. `test/admin` necesita las mesas de P2d-1 |
| P2c Turnos y fichajes | ✅ Hecho | Turnos, intercambios (traspaso en una transacción) y fichajes: fichar, alta manual, corrección y anulación como revisiones, cadena de hashes compatible con Nest con el mismo advisory lock, jornadas con el cuadrante y sus discrepancias, hoja de horas, CSV e integridad. Realtime de `ShiftCreated/Deleted` y auditoría de los fichajes que toca un admin. `test/shifts` y `test/time-tracking` pasan contra Go |
| P2d-1 Pedidos y mesas | ⏳ En marcha | Ola 3b. `orders` y `tables`. `test/orders` y `test/tables` |
| P2d-2 Impresoras | ⏳ En marcha | Ola 3b. `printer`. `test/printer` y `test/printers` |
| P2d-3 Cierres de caja y estadísticas | ⏳ En marcha | Ola 3b. `cash-closes` y `stats`. Sus e2e crean pedidos por HTTP: se comprueban en la integración, con P2d-1 en `dev` |
| P2e Cobros | ✅ Hecho | `/establishments/{id}/establishment-subscription` (lectura, asientos, Checkout y portal), `/stripe/webhook` con firma, refresco desde Stripe (`SubscriptionRefresher` ya cableado), sincronización de asientos como método (`SyncSeatsOnMemberChange`, falta suscribirlo a los eventos de miembros de P2b), eventos `Subscription*` y `DuplicateSubscriptionDetected` con sus suscriptores (caché, realtime y log), y emails con Resend. Ningún directorio de `apps/api/test` es solo suyo: el test del portal de `test/permissions` pasa contra Go |
| P2f Realtime | ✅ Hecho | `GET /establishments/{establishmentId}/events` (SSE con `: open`, heartbeat de 25 s, cierre a los 30 min y `Last-Event-ID`), `service.RealtimeService` (implementa `ports.Realtime`: registro de streams por local, `Publish`, `Revoke`), bus en Redis compatible con Nest (canal `coaster:realtime`, replay de 2 min en `realtime:<id>:replay`), sin Redis solo en este proceso, cierre de streams al apagar. `test/realtime` pasa contra Go (publicar y revocar, en los tests de Go). Los suscriptores de `realtime/events/handlers/` los escribe cada paquete |
| P3 IA | ⬜ Pendiente | Se lanza en cuanto P2d-1 esté en `dev` |
| P4 Arnés e2e | ✅ Hecho | `E2E_TARGET=go` lanza los e2e de `apps/api` contra Go: el `globalSetup` compila el binario, cada archivo arranca su servidor detrás de un proxy que pone `/api/v1` y un JWT de verdad, buzón de test y claves de Google por HTTP, `e2e-paquetes.txt`, `scripts/e2e-go.sh` y job de CI `api-go-e2e`. Lo que falta en Go está en «Convenciones de P4» |
| P5 Salida | ⬜ Pendiente | |

## Siguiente paso

Ola 3b: lo que queda de P2, partido en seis subpaquetes que van a la vez, cada uno en su
sesión de Claude Code en la nube: **P2b-1 Locales y usuarios**, **P2b-2 Miembros e
invitaciones**, **P2b-3 Admin**, **P2d-1 Pedidos y mesas**, **P2d-2 Impresoras** y **P2d-3
Cierres de caja y estadísticas**. Antes de empezar, leer todas las «Convenciones», en especial
«Convenciones de la ola 3b». Cada subpaquete añade a `e2e-paquetes.txt` los directorios de
`apps/api/test` que pasan contra Go.

Después, el orquestador:
1. Lanza **P3 IA** en cuanto P2d-1 esté en `dev`.
2. Hace la integración: añade a `e2e-paquetes.txt` los e2e que necesitan varios subpaquetes
   (`test/admin`, `access-revocation`, `test/cash-closes`, `test/stats`, `test/permissions` y
   `test/modules`) y arregla lo que salga.

## Convenciones de P0

Lo que P0 deja hecho y cómo se usa desde P1 en adelante.

**Arrancar y probar**
- `go vet ./...` y `go test ./...` desde `apps/api-go`. Los tests de `repository/` levantan
  `postgres:18-alpine` con testcontainers, así que necesitan Docker.
- En local: `docker compose up db redis api-go`. Go escucha en `http://localhost:3001` y Nest
  sigue en el 3000, contra la misma base de datos.
- `go run ./cmd/api` necesita `DATABASE_URL`, `AUTH_JWT_SECRET` y `PUBLIC_DIR=../api/public`.
  `PUBLIC_DIR` es la única variable que Nest no tiene: en la imagen es `/app/public`.

**Errores**
- Los servicios devuelven `domain.NotFound(domain.CodeX)`, `domain.Forbidden(…)`, etc.
  (`domain/errors.go`). Los códigos están en `domain/error_codes.go` y un test comprueba que
  coinciden con `@coaster/common`: si se añade uno allí, hay que añadirlo aquí.
- El handler hace `writeError(w, err)`. Un `domain.Error` sale con el cuerpo de Nest y su
  estado; cualquier otro error se registra con `slog` y sale como el 500 genérico.
- `domain.TooManyRequests` sale sin `error`, como el `HttpException` con un string de Nest, y
  `domain.PaymentRequired` sale con `errorCode`, como el 402 de `SubscriptionActiveGuard`.
- Los middlewares (paquete `middleware`) escriben con `middleware.WriteError`, que es lo que
  usa `writeError` por dentro. Está en `middleware` porque `http` importa `middleware` y no
  al revés.

**Handlers y rutas**
- Cada entidad tiene su `xxx_handler.go` con un método que registra sus rutas en el
  `*http.ServeMux`, con el prefijo `apiPrefix` (`"GET " + apiPrefix + "/orders/{id}"`).
  En `router.go` se añade el campo al struct `Handlers` y una línea en `NewRouter`.
- Una ruta que no existe, o con otro método, responde el 404 de Nest sin hacer nada.
- Respuestas con `writeJSON(w, status, v)`: sin escapar `<>&` y sin salto de línea final,
  como `JSON.stringify`. Nest responde 201 a los `POST` salvo que el controlador diga otra
  cosa con `@HttpCode`.
- Las fechas del JSON van como `domain.Time`, que escribe `2026-09-27T10:00:00.000Z` como
  `toISOString` y se puede leer y escribir directamente con pgx.

**Cuerpos de petición** (`decodeJSON(r, &input)`, en `validation.go`)
- Un struct con `json` y `validate`. `msg` cambia el texto de una regla, como el
  `{ message: ErrorCodes.X }` de class-validator; `type` es el texto para un valor que falta
  o es de otro tipo:
  ```go
  type createEstablishmentRequest struct {
  	Name  string  `json:"name" validate:"required,min=3,max=50" msg:"required=REQUIRED,min=MIN_LENGTH,max=MAX_LENGTH,type=INVALID_TYPE"`
  	Phone *string `json:"phone" validate:"omitnil,max=20"`
  }
  ```
- `@IsOptional` es un puntero con `omitnil`. Un campo sin `omitnil` tiene que venir y no
  ser `null`.
- Un struct anidado se valida solo; un slice necesita `dive` para validar sus elementos
  (`@ValidateNested`, o `{ each: true }` si son valores).
- Reglas con el texto de class-validator ya traducido: `required`, `min`, `max`, `gte`, `lte`
  (según sea texto, número o slice), `oneof`, `email`, `uuid`, `uuid4`, `latitude`,
  `longitude`, `ip`, `unique` e `iso8601` (propia). Una regla nueva se registra en
  `newValidator` y su texto en `defaultRuleMessage`.

**Eventos**
- `ports.Event` tiene `Name()`; `ports.EventPublisher` tiene `Publish(ctx, event)`.
- `event.Bus` es la implementación en memoria: `Subscribe(nombre, handler)` y cada handler
  corre en su goroutine con un contexto que no se cancela al acabar la petición. `main`
  espera a que terminen al apagar (`bus.Wait()`).

**Base de datos**
- `repository.NewPool` en `client.go`. En los tests de `repository/`, `testPool` ya tiene
  todas las migraciones de Prisma aplicadas y `resetDB(t)` vacía las tablas.
- Las tablas y columnas son las de Prisma, con comillas: `"User"`, `"createdAt"`.

**Apagado**
- `main` deja de aceptar conexiones con SIGTERM y espera hasta 8 s a las que están abiertas.
  Un stream SSE no acaba solo: P2f tiene que cerrarlo con `server.RegisterOnShutdown`.

## Convenciones para la ola de P2

**Eventos entre paquetes**
- Cada evento de Nest (`<módulo>/events/impl/*.event.ts`) es un struct en
  `domain/<entidad>_events.go` del paquete dueño de la entidad, con los mismos campos, y
  `Name()` devuelve el nombre de la clase de Nest (`"OrderCreatedEvent"`). El servicio lo
  publica con `ports.EventPublisher` después de guardar.
- El dueño del evento escribe también sus suscriptores, aunque en Nest estén en otro módulo:
  los de `realtime/events/handlers/` (con `ports.Realtime`), los de caché y los de auditoría.
  Así nadie depende de un struct que otro paquete está escribiendo a la vez. Si el suscriptor
  necesita algo de otro paquete (por ejemplo, sincronizar los asientos de Stripe al cambiar un
  miembro), se apunta en el informe y el orquestador lo cablea entre olas.
- `ports.Realtime` (`Publish(establishmentID, evento, payload)` y `Revoke(establishmentID,
  userID)`) es `RealtimeService` de Nest. Los nombres de evento están en
  `domain/realtime_events.go`. En `main.go` la variable `realtime` es `event.NopRealtime{}`
  hasta que P2f cambie esa línea por la implementación de verdad.

**Servicios y handlers**
- La decisión de «Decisiones tomadas» se mantiene: los handlers reciben el servicio concreto
  (`*service.OrderService`). P1 usa interfaces pequeñas en los handlers de auth para sus
  tests; está pendiente de revisar con Miguel y no se copia en P2.

## Convenciones de P1

Cómo se protege una ruta y cómo lee el handler quién llama. Todo está en
`adapter/handler/middleware` (`guard.go`, `rules.go`, `request_context.go`).

**Registrar una ruta**
- Todas las rutas se registran con `handle(mux, guard, "MÉTODO /ruta", h.metodo, reglas...)`
  (`routes.go`), una línea por ruta en el `RegisterRoutes(mux, guard)` del handler. `handle`
  pone `apiPrefix` y pasa la ruta por `Guard.Protect`. **Ninguna ruta se registra sin el
  guard**, porque el rate limit global y la comprobación de suscripción son globales en Nest.
- En `router.go` el handler se añade al struct `Handlers` y su `RegisterRoutes` dentro del
  bloque `if handlers.Guard != nil`.
  ```go
  func (h *OrderHandler) RegisterRoutes(mux *http.ServeMux, guard *middleware.Guard) {
  	handle(mux, guard, "GET /establishments/{establishmentId}/orders", h.list,
  		middleware.Permissions(domain.PermissionViewOrders), middleware.Modules(domain.ModuleOrders))
  }

  func (h *AuthHandler) RegisterRoutes(mux *http.ServeMux, guard *middleware.Guard) {
  	handle(mux, guard, "POST /auth/login", h.login, middleware.Throttle(10, time.Minute))
  }
  ```

**Reglas** (el equivalente de cada decorador de Nest)
| Nest | Go |
|---|---|
| `@UseGuards(AuthGuard)` | `middleware.RequireAuth()` → 401 `INVALID_CREDENTIALS` sin token válido o con el usuario inactivo |
| `@UseGuards(OptionalAuthGuard)` | `middleware.OptionalAuth()` |
| `@UseGuards(AuthGuard, AdminGuard)` + `@Admin()` | `middleware.Admin()` (ya incluye la auth) → 403 `UNAUTHORIZED` |
| `@UseGuards(AuthGuard, EstablishmentPermissionsGuard)` + `@EstablishmentPermissions(a, b)` | `middleware.Permissions(a, b)` (ya incluye la auth). Sin argumentos solo pide ser miembro activo, como el guard sin decorador |
| `EstablishmentModulesGuard` + `@EstablishmentModules(m)` | `middleware.Modules(m)` → 403 `MODULE_NOT_ENABLED` |
| `@SkipSubscriptionCheck()` | `middleware.SkipSubscriptionCheck()` |
| `@Throttle({ default: { limit, ttl } })` | `middleware.Throttle(limit, ttl)`; sin ella, 300 por minuto |
| `@SkipThrottle()` | `middleware.SkipThrottle()` |

- El local es **siempre** el parámetro `{establishmentId}` de la ruta, como en Nest
  (`request.params.establishmentId`). Si la ruta lo llama de otra forma, los guards no lo ven.
- Las comprobaciones corren en el orden de Nest: rate limit, suscripción (solo escrituras con
  `{establishmentId}`, 402 con `errorCode`; un admin de la plataforma pasa), auth, admin,
  permisos (un admin de la plataforma los tiene todos) y módulos. El cuerpo se valida después,
  en el handler.

**Leer quién llama en el handler**
- `middleware.CurrentUser(r.Context())` → `*domain.User` (`@CurrentUser`). Con
  `OptionalAuth` puede ser `nil`.
- `middleware.CurrentSession(r.Context())` → `*domain.SessionClaims` (`sub`, `sid`,
  `@CurrentSession`). Solo con `RequireAuth`, `Admin` o `Permissions`.
- `middleware.EstablishmentPermissionsOf(r.Context())` → los permisos del usuario en el local
  (`@EstablishmentPermissionsOf`). Solo con `Permissions`.
- `middleware.ClientIP(r.Context())` → la IP con `TRUST_PROXY_HOPS` (`request.ip`).
- En los tests de un handler se puede meter el usuario con `middleware.WithCurrentUser`.

**Caché y servicios compartidos**
- `ports.Cache` (`adapter/cache`) guarda como Nest (`{"v": ...}`, 8 h) en las mismas claves, así
  que Nest y Go pueden compartir Redis. Sin `REDIS_URL` no cachea nada. Las claves están en
  `service/cache.go`: un servicio que cambia el rol de un usuario, un miembro, los módulos o la
  suscripción de un local hace `cache.Forget(...)` de su clave después de guardar.
- `service.SecurityService` responde las comprobaciones de permisos, módulos y suscripción.
  P2e le pasa su `ports.SubscriptionRefresher` en `main.go` (hoy va `nil`).
- Los emails van por `ports.Mailer`. Hoy `email.LogMailer` solo los escribe en el log (con el
  enlace fuera de producción) y, con `TEST_MAILBOX_URL`, `email.TestMailbox` los manda al arnés
  de los e2e. P2e añade el de Resend y lo elige en `main.go`.
- Los eventos de auth (`domain.AuthEventOccurred`) se guardan en `AuthEvent` desde un
  suscriptor del bus (`AuthEventService.Record`).

## Convenciones de P2e

- Stripe está detrás de `ports.PaymentGateway` (`adapter/payment/stripe.go`), que devuelve
  tipos de `domain/stripe.go` y ya traduce los fallos a los `domain.Error` de Nest
  (`STRIPE_*_FAILED`). El servicio nunca importa stripe-go. En los tests del adaptador,
  `newStripeGateway` recibe unos `stripe.Backends` que apuntan a un `httptest.Server`; los
  webhooks se firman con `webhook.GenerateTestSignedPayload`.
- `service.SubscriptionService` es todo `establishment-subscription`: los handlers de las
  rutas y del webhook reciben el mismo servicio. `HandleWebhook(ctx, cuerpo, firma)` verifica
  y enruta; el handler solo lee el cuerpo crudo.
- Los eventos `SubscriptionActivated`, `SubscriptionCancelled`, `SubscriptionOverridden`,
  `SubscriptionPaymentFailed`, `SubscriptionRenewed` y `DuplicateSubscriptionDetected` están
  en `domain/subscription_events.go`. `domain.SubscriptionEventNames` son los que olvidan la
  caché de la suscripción y avisan por realtime (`subscriptionUpdated`). Quien conceda o
  revoque un plan a mano (admin, P2b) publica `domain.SubscriptionOverridden` después de
  guardar, y con eso basta.
- Los asientos: al cambiar los miembros de un local hay que llamar a
  `SubscriptionService.SyncSeatsOnMemberChange(ctx, establishmentID)` desde un suscriptor de
  los eventos de miembro invitado y eliminado (en Nest, `MemberInvitedEvent` y
  `MemberRemovedEvent`). Traga y registra el error, como en Nest.
- `email.ResendMailer` se usa cuando hay `RESEND_API_KEY`; `TEST_MAILBOX_URL` sigue ganando.
  Los textos están en `adapter/email/templates.go` y el marco en `templates/layout.html`.

## Convenciones de P4

Cómo se lanzan los e2e de `apps/api/test` contra el servidor Go y qué tiene que hacer cada
paquete para que los suyos pasen.

**Lanzarlos en local** (hace falta Docker, Node 26 por `Temporal` y el Go de `go.mod`; en
local `export GOTOOLCHAIN=go1.27.0`)
- Contra Nest, como siempre: `npm run test:e2e -w @coaster/api`.
- Contra Go, los directorios de `e2e-paquetes.txt`: `apps/api-go/scripts/e2e-go.sh`, desde la
  raíz del repo. Los argumentos extra van a vitest (`-t 'nombre del test'`).
- Contra Go, un directorio cualquiera: `E2E_TARGET=go npm run test:e2e -w @coaster/api -- test/orders`.

**Cómo funciona** (`apps/api/test/utils/go-app.ts`)
- Con `E2E_TARGET=go`, `setup.e2e.ts` compila `./cmd/api` una vez (`go build`) después de las
  migraciones. Cada archivo e2e arranca su propio proceso Go en un puerto libre, igual que
  hoy arranca su propia app de Nest, así el rate limit en memoria no pasa de un archivo a otro.
- El proceso recibe el entorno del test (`DATABASE_URL` del testcontainer, `AUTH_JWT_SECRET`,
  `PRINTER_JWT_SECRET`, `GOOGLE_CLIENT_ID`, `PWNED_PASSWORDS_ENABLED=false`, `REDIS_URL=` vacío)
  más `PORT`, `PUBLIC_DIR=apps/api/public`, `TEST_MAILBOX_URL` y `GOOGLE_CERTS_URL`.
- `testSetup.app.getHttpServer()` es un proxy en el proceso del test que:
  - pasa `/api/...` a `/api/v1/...` (el Nest de los e2e no tiene versión; producción y Go sí).
    Por eso un mensaje como `Cannot GET /api/v1/x` lleva la versión;
  - cambia `x-e2e-user-id` (o `mockUser` si no viene) por `Authorization: Bearer <jwt>`,
    firmado con el `AccessTokenService` de Nest: `sub`, `sid = e2e-session-<id>`, `iss coaster`,
    `aud coaster-api`, 15 min. Si la petición ya trae `authorization` (la impresora), no la toca;
  - deja pasar los streams SSE y cierra la petición a Go cuando el test cancela.
- Prisma sigue preparando los datos y `clearDatabase` vacía las tablas, como con Nest.
- `testSetup.app.get(...)` lanza un error: con Go no hay servicios dentro del proceso.

**Lo que cambia respecto a `MockAuthGuard`**
- El usuario del test tiene que **existir en la base de datos y estar activo**, y su `role` es
  el de la base de datos, no el de `mockUser`/`actAs`. Los e2e ya crean sus usuarios; si uno
  falla solo por esto, se salta en modo Go con `it.skipIf(isGoTarget)` y un comentario.
- El `AuthGuard` de Nest no comprueba que la sesión exista, así que el arnés no crea filas de
  `AuthSession`. P1 tiene que copiar eso tal cual (si Go comprobara la sesión, el arnés
  tendría que crearla).

**Lo que Nest hace dentro del proceso y cómo se cubre en Go**

| e2e | Depende de | Cómo se cubre en Go | Paquete |
|---|---|---|---|
| `auth/account`, `auth/account-recovery`, `establishment-members/*` (3) | `TestMailbox` (el `AUTH_MAILER` sustituido) | Con `TEST_MAILBOX_URL`, Go no manda emails: hace `POST` de `{"kind","to","token"}` a esa URL y espera el 2xx antes de seguir, igual que Nest espera al mailer. `kind` es `invite`, `verifyEmail`, `resetPassword` o `passwordChanged`; `token` va en todos menos `passwordChanged`. El arnés ya tiene el servidor que lo recibe y lo mete en `testSetup.mailbox` | P1 hace el adaptador de test del puerto de email (los emails de auth son los primeros); P2e hace el de Resend contra el mismo puerto; P2b lo usa para las invitaciones |
| `auth/google` | `vi.stubGlobal('fetch')` con las claves públicas | Con `GOOGLE_CERTS_URL`, Go pide las claves a esa URL en lugar de a `https://www.googleapis.com/oauth2/v3/certs` (con `idtoken.NewValidator` y `option.WithHTTPClient` con un `RoundTripper` que cambia la URL). El arnés ya sirve ahí lo que devuelve el `fetch` falso del test | P1 |
| `realtime` | `app.get(RealtimeService).publish/revoke` (3 tests) | Se saltan en modo Go. Los otros dos (403 y apertura del stream) sí van contra Go. P2f cubre publicar y revocar en sus tests de Go | P2f |
| `ai` | `vi.mock('ai')` | Nada: el test acepta 201 o 500, y sin `AI_GATEWAY_API_KEY` Go puede responder 500. Si P3 quiere probar la respuesta, puede leer una URL base del gateway de una variable de test y el arnés servir una respuesta falsa compatible con OpenAI | P3 |
| `admin` | `MockAuthGuard` deja pasar a un usuario inactivo | «should refuse demoting the last admin» se salta en modo Go: con un token de verdad es un 401 | — |
| Stripe | — | Ningún e2e llama a Stripe (`admin` solo lee las columnas de Stripe en la base de datos) | — |

- `TEST_MAILBOX_URL` y `GOOGLE_CERTS_URL` son **solo para tests**: `config.Load` tiene que
  fallar si alguna viene con `NODE_ENV=production`. Las añade a `Config` el paquete que las use.
- Sin `REDIS_URL`, Go no cachea, igual que Nest: nada de caché en memoria para lo que Nest
  guarda en Redis (usuario, rol, suscripción), porque `clearDatabase` no llega a ella y un test
  leería los datos del anterior.

**Cuando un paquete termina**
- Añade a `e2e-paquetes.txt` sus directorios de `apps/api/test` (uno por línea, por ejemplo
  `test/orders`) y comprueba en local que `scripts/e2e-go.sh` pasa. El job `api-go-e2e` del CI
  lanza esa lista; con la lista vacía pasa sin hacer nada.
- Un test que no puede ir contra Go se salta solo en modo Go, con `it.skipIf(isGoTarget)` o
  `describe.skipIf(isGoTarget)` (`isGoTarget` sale de `test/utils/e2e-setup`) y un comentario
  con el motivo. Nunca se salta contra Nest.

## Convenciones de P2f

Cómo se manda algo por tiempo real desde otro paquete.

- En `main.go`, `realtime` es un `ports.Realtime` (`*service.RealtimeService`). El suscriptor
  de un evento lo usa igual que el handler de `realtime/events/handlers/` de Nest (los
  nombres del evento son de ejemplo):
  ```go
  bus.Subscribe(domain.OrderCreatedEventName, func(ctx context.Context, e ports.Event) {
  	created := e.(domain.OrderCreatedEvent)
  	realtime.Publish(created.EstablishmentID, domain.RealtimeOrderCreated, created.Order)
  })
  ```
  El primer paquete que use `realtime` en `main.go` quita la línea `_ = realtime`.
- El payload se escribe como `JSON.stringify` (sin escapar `<>&`), así que tiene que tener la
  misma forma que el de Nest: un struct con tags `json` o un `map`. Las fechas, como
  `domain.Time`.
- `realtime.Revoke(establishmentID, userID)` cierra los streams de esa persona en ese local, en
  esta instancia y en las demás (por ejemplo, al quitar un miembro o cambiarle el rol).
- En los tests de un servicio o suscriptor basta un fake de `ports.Realtime` que guarde las
  llamadas. `service.RealtimeService` se puede usar tal cual con un `ports.RealtimeBus` falso.

## Convenciones de P2c

- `domain.Instant` escribe una fecha como `Temporal.Instant.toString` (`2026-09-27T10:00:00Z`,
  sin milisegundos si son cero). Nest la usa en los turnos y los intercambios; el resto de fechas
  van como `domain.Time` (`toISOString`). `domain.FormatISO` es `toISOString` para un texto suelto.
- `domain.ParseInstant` es `Temporal.Instant.from` (exige zona) y `domain.ParseDate` es
  `new Date()` para las formas ISO 8601; las dos devuelven `(time.Time, bool)`.
- La jornada se cuenta en `Europe/Madrid` (`domain.WorkdayDateOf`, `domain.StartOfEstablishmentDay`).
  `domain/workday.go` importa `time/tzdata`, así que la zona carga aunque la imagen no tenga
  ficheros de zonas.
- Para P3: `ShiftService.List`/`ListBetween` y `TimeEntryService.TimeSheet`/`Workdays` son los
  `GetShiftsQuery` y `GetWorkdaysQuery` de Nest.
- Los e2e contra Go compilan el binario en `os.tmpdir()/coaster-api-go-e2e`, que comparten todos los
  worktrees de la máquina: con varios agentes a la vez hay que lanzar `scripts/e2e-go.sh` con
  `TMPDIR` apuntando a un directorio propio, o un agente prueba el binario de otro.

## Convenciones de P2a

- `ProductService.AdjustStock(ctx, establishmentID, productID, delta)` es
  `AdjustProductStockCommand`: los pedidos (P2d, las sagas de `orders.sagas.ts`) y las
  herramientas de IA (P3) lo llaman para restar o devolver stock. Publica `ProductStockChangedEvent`.
- `writeSuccess(w)` (`handler/http/success.go`) es `commonMapper.getSuccessResponse()`: 200 con
  `{"success":true}`. Un `POST` que devuelve `void` en Nest responde `w.WriteHeader(http.StatusCreated)`
  sin cuerpo, y un `PATCH`/`PUT` que devuelve `void`, `w.WriteHeader(http.StatusOK)`.
- En un `PATCH` donde `null` vacía una columna (Nest pasa el `null` a Prisma), el handler usa
  `decodeJSONWithNulls(r, &input)`, que además devuelve qué campos llegaron a `null`.
- Regla de validación nueva `oneofci`: `oneof` comparando el valor sin espacios y en minúsculas,
  para un DTO con `@Transform(trim + toLowerCase)` antes de `@IsIn`.
- `domain.Languages`, `domain.IsLanguage` y `domain.AsLanguage` (`domain/language.go`) son
  `LANGUAGES`, `isLanguage` y `asLanguage` de `@coaster/common`.
- Suscriptores de realtime: `service.CatalogRealtime.Forward` recibe los eventos del paquete con
  un `switch` de tipos y llama a `ports.Realtime`; `main` lo suscribe a cada nombre de
  `service.CatalogRealtimeEvents`.
- Prisma pone `@default(uuid())` y `@updatedAt` desde el cliente, no en la base de datos: Go
  genera el `id` con `uuid.NewV4()` y cada `UPDATE` de una tabla con `@updatedAt` escribe
  `"updatedAt" = now()` (la carta usa el `updatedAt` del producto para saber si hay cambios sin publicar).
- Las columnas de arrays de enums (`"Allergen"[]`) se escriben con `$n::text[]::"Allergen"[]` y se
  leen con `COALESCE(columna, '{}')::text[]`.
- Los fakes de los tests de `service` y `handler/http` comparten paquete con los de los demás
  paquetes P2: llevan el nombre de la entidad (`fakeProductRepo`, `catalogRealtimeFake`) para no chocar.

## Convenciones de la ola 3b

**Lo que ya está hecho para que los subpaquetes no escriban lo mismo a la vez**
- `domain/user_events.go`: `UserUpdated` (`UserUpdatedEvent`). Lo publican users (P2b-1) y
  admin (P2b-3); el suscriptor que olvida `userCacheKey` y `userRoleCacheKey` lo escribe P2b-1.
- `domain/admin_audit.go`: las acciones y tipos de destino de `AdminAuditLog`,
  `AdminAuditEntry` (`RecordAuditEntry`) y el evento `AdminAction` (`AdminActionEvent`). Quien
  hace algo que se audita publica `AdminAction` después de guardar: admin (P2b-3) y el cambio de
  rol de un miembro hecho por un admin de la plataforma (P2b-2, el `audit-member-role-changed`
  de Nest). El suscriptor que escribe la fila (`RecordAdminActionHandler`) es de P2b-3. Los de
  fichajes siguen como los dejó P2c (`TimeEntryRepository.RecordAudit`).
- `domain/order.go` y `domain/table.go`: `OrderStatus`, `PaymentStatus`, `DeliveryStatus`,
  `PaymentMethod`, `AdjustmentTarget`, `AdjustmentType` y `TableStatus`. Los structs del JSON
  (`Order`, `OrderItem`, `Table`…) los escribe P2d-1, que es dueño del mapper.
- `domain/order_pricing.go`: `CalculatePricing` es `OrderPricingEngine.calculate`, y `TaxOf` y
  `GrossFromNet` son los de `tax-rates.ts`. Redondean como `Math.round`. Lo usan pedidos,
  cierres de caja, estadísticas e IA; nadie lo vuelve a escribir.

**Quién cablea qué**
- P2b-2 suscribe `SubscriptionService.SyncSeatsOnMemberChange` a sus eventos de miembro
  invitado y eliminado en `main.go` (ver «Convenciones de P2e»).
- P2b-3 publica `domain.SubscriptionOverridden` al conceder o revocar un plan, y con eso basta.
- P2d-1 resta y devuelve stock con `ProductService.AdjustStock` desde suscriptores de sus
  eventos, como `orders.sagas.ts`.
- Cada subpaquete escribe su propio SQL, aunque toque tablas de otro (admin lee pedidos y
  ajustes; cierres y estadísticas leen `"Order"`): así nadie espera al repositorio de otro.

**Los e2e que necesitan a más de uno**
- `test/admin` usa mesas (P2d-1); `access-revocation` usa pedidos (P2d-1); `test/cash-closes` y
  `test/stats` crean pedidos por HTTP (P2d-1); `test/permissions` y `test/modules` necesitan
  P2b-1, P2b-2 y P2d-1. Si al terminar un subpaquete su parte todavía no está en `dev`, deja esos
  directorios fuera de `e2e-paquetes.txt` y lo dice en su informe: los añade el orquestador en la
  integración.

**Empujar**
- Un solo push por subpaquete: `git pull --rebase origin dev`, volver a pasar `go vet`,
  `go test ./...` y `scripts/e2e-go.sh`, y `git push origin dev`.
- Al hacer rebase, en `main.go`, `router.go`, `e2e-paquetes.txt` y `MIGRACION.md` se quedan las
  líneas de los dos lados.

## Ejecución con agentes

Los paquetes los ejecuta un agente orquestador que lanza subagentes. Se hace en olas:

| Ola | Paquetes | Cómo |
|---|---|---|
| 1 | P0 | Un solo agente: es la base y tiene que ser coherente. |
| 2 | P1 y P4 | Dos subagentes en paralelo. |
| 3 | P2a, P2c, P2e y P2f | Subagentes en paralelo. P2b y P2d no llegaron a empezar. |
| 3b | P2b-1, P2b-2, P2b-3, P2d-1, P2d-2 y P2d-3 | Seis sesiones de Claude Code en la nube en paralelo, cada una empuja a `dev` al terminar; el orquestador sigue en su sesión. |
| 4 | P3 | Una sesión, en cuanto P2d-1 esté en `dev`. |

P5 **no** lo hacen los agentes: necesita infraestructura, la beta con uso real y a Miguel.

**Cada paquete está terminado cuando:**
1. Sigue `CLAUDE.md`, `ESTRUCTURA.md` y usa solo librerías ✅ de `LIBRERIAS.md`.
2. `go vet ./...` y `go test ./...` pasan en `apps/api-go`.
3. Desde la ola 3, los e2e de `apps/api/test/<módulo>` del paquete pasan contra el servidor
   Go. Los e2e contra Nest tienen que seguir pasando.
4. Su fila de la tabla de estado está actualizada, con lo que no se ha podido copiar de Nest
   en «Diferencias conocidas».
5. Está en `dev` en commits pequeños, uno por paso que se pueda revisar por separado.

**Reglas para trabajar en paralelo:**
- **Todo va directo a `dev`, sin ramas**, como el resto del proyecto. Antes de empujar:
  `git pull --rebase`, volver a pasar los tests y entonces `git push`.
- Se empuja **una vez por paquete**, no por commit: cada push a `dev` vuelve a desplegar
  `api-beta`.
- Los archivos compartidos (`router.go`, `main.go`) solo se tocan para **añadir** líneas,
  así el rebase casi nunca choca.
- En las sesiones de Claude Code en la nube, el hook de `.claude/hooks/session-start.sh`
  arranca Docker y deja Node 26 y Go 1.27, así que `go test ./...` y `scripts/e2e-go.sh` se
  pueden lanzar ahí mismo. Si en otro sitio no hay Docker, los tests con base de datos se
  comprueban en el job de CI de GitHub Actions.
- Si algo de Nest no se puede copiar, se apunta en «Diferencias conocidas» y se sigue. Solo
  se para si hace falta una librería que no esté ✅ o tocar infraestructura de producción
  (Cloud Run, secretos, panel de Stripe).

## Diferencias conocidas

Lo que Go hace distinto de Nest a propósito o porque no se ha podido copiar.

| Paquete | Diferencia | Por qué |
|---|---|---|
| P0 | El orden de `message` en los errores de validación puede cambiar | validator se para en la primera regla que falla de cada campo |
| P0 | Si un valor es del tipo equivocado (o falta), solo se devuelven esos errores y los de campos desconocidos, no los del resto de reglas | Sin el tipo correcto no se puede rellenar el struct para pasarle validator |
| P0 | Los campos desconocidos salen en orden alfabético, no en el del cuerpo | Go lee el cuerpo en un mapa, que no guarda el orden |
| P0 | No hay conversión implícita de tipos: `"5"` en un campo numérico es un error | Nest usa `enableImplicitConversion`, pero `apps/web` ya manda los tipos correctos |
| P0 | `iso8601` acepta fecha, o fecha y hora con segundos, fracción y zona opcionales; no semanas ni días del año | Es lo que manda `apps/web`, y Go no tiene la expresión regular de validator.js |
| P0 | Solo gzip, sin deflate | gzhttp solo hace gzip, y todos los navegadores lo aceptan |
| P0 | Un cuerpo que no es JSON responde 415 | Fastify acepta también `text/plain`; ningún endpoint lo usa |
| P0 | Sin Swagger en `/api/docs` | Descartado en `LIBRERIAS.md`; solo existía fuera de producción |
| P1 | Sin `RESEND_API_KEY` los emails de auth se escriben en el log en lugar de fallar | Resend llega en P2e; hasta entonces el flujo funciona en local y en beta |
| P1 | El contador del rate limit va por patrón de ruta e IP, no por clase y método del controlador | En Go no hay clases; como la clave es otra, Nest y Go no comparten contadores en el mismo Redis |
| P1 | Un cuerpo que no es JSON válido responde 400 después del rate limit y de los guards, no antes | Fastify lee el cuerpo antes de los guards; en Go lo lee el handler |
| P1 | El `aud` del JWT va como lista (`["coaster-api"]`) | Es como lo escribe golang-jwt; jose en Nest lo acepta igual |
| P1 | La IP sin proxy delante es `1.2.3.4` y no `::ffff:1.2.3.4` | Go no pone el prefijo IPv6 en las conexiones IPv4. En Cloud Run se lee de `X-Forwarded-For` y sale igual |
| P1 | Un token de Google vale hasta el mismo segundo de `exp` (jose lo rechaza en ese segundo) y las claves se guardan lo que diga `Cache-Control` | Lo hace `idtoken`; el emisor, `RS256` y `nbf` se comprueban a mano |
| P1 | Los atributos de la cookie salen en otro orden (`Path; Expires; HttpOnly; Secure; SameSite`) | Es el orden de `net/http`; los navegadores no lo miran |
| P1 | Sin `SubscriptionRefresher`: una suscripción caducada en la base de datos no se comprueba contra Stripe antes del 402 | Llega con P2e |
| P2f | Un cliente tan lento que acumula 64 eventos sin leer pierde el stream (el navegador vuelve a conectar y pide lo perdido con `Last-Event-ID`) | Node guarda en memoria sin límite lo que el socket no ha enviado; en Go cada stream tiene una cola fija para que `Publish` no se bloquee |
| P2f | Los eventos perdidos (`Last-Event-ID`) se escriben antes que los que llegan mientras se leen de Redis | En Nest el replay es asíncrono y se pueden mezclar; en Go lo escribe la misma goroutine que el resto del stream |
| P2e | El webhook no mira si el cuerpo es JSON antes de comprobar la firma: un cuerpo roto responde `STRIPE_WEBHOOK_SIGNATURE_INVALID` (o el error de firma que toque) en lugar del 400/415 de Fastify | Go lee el cuerpo crudo en el handler; Stripe siempre manda JSON |
| P2e | stripe-go exige `"object":"event"` en el cuerpo del webhook; el SDK de Node no lo mira | Stripe siempre lo manda |
| P2e | Una línea de suscripción con `quantity` 0 se lee como 1 asiento (en Nest solo sin `quantity`) | stripe-go no distingue 0 de un campo ausente |
| P2e | `PRO_BASE_PRICE_CENTS`, `PRO_INCLUDED_SEATS` y `PRO_EXTRA_SEAT_PRICE_CENTS` se leen con `strconv.Atoi` (tras quitar espacios): `"5.0"` o `"1e3"` usan el valor por defecto | `Number()` de JavaScript los acepta; son variables nuestras y van como enteros |
| P2e | En los emails, `'` y `"` de los valores se escapan como `&#39;` y `&#34;`, no como `&#x27;` y `&quot;` | Es el escape de `html/template`; el navegador lo muestra igual |
| P2e | Sin `RESEND_API_KEY` los emails siguen yendo al log; Nest usa una clave falsa y el envío falla | Se mantiene lo de P1 |
| P2a | En un `PATCH`, un `null` en un campo que no admite nulos (`name`, `price`, `categoryId`, `allergens`, `taxRate` de la categoría…) se ignora; Nest lo deja pasar y Prisma responde 500. `null` en `icon`, `imageUrl` y `ownTaxRate` sí vacía la columna, igual que en Nest | Go no distingue un campo que falta de uno a `null` sin leer el cuerpo aparte; solo se hace para las columnas que admiten nulos |
| P2a | Un número con decimales en un campo entero (`price`, `currentStock`, `taxRate`…) responde 400 `INVALID_TYPE`; en Nest pasa `@IsNumber` y Prisma responde 500 | Los campos son `int` en Go |
| P2a | El slug de la carta quita los acentos con una tabla de las letras latinas (U+00C0–U+017F) y no con la normalización NFD | `golang.org/x/text` no está en `LIBRERIAS.md`; en ese rango da lo mismo que Node (comprobado letra a letra) y fuera de él la letra se cambia por `-` |
| P2a | El nombre y la descripción de una línea de la carta se cortan a 80 y 300 caracteres, no unidades UTF-16 | Solo cambia con emojis y otros caracteres fuera del plano básico |
| P2a | Las claves del JSON de la carta publicada salen en el orden del struct, no en el de `jsonb` | Nest devuelve el objeto tal como lo guarda Postgres; el contenido es el mismo |
| P2c | Las fechas de texto (`startDate`/`endDate` de `GET /shifts`, `occurredAt` de los fichajes) se leen solo en las formas ISO 8601: fecha, o fecha y hora con o sin zona (sin zona es UTC) | `new Date()` de JS acepta además formatos como `Sep 27 2026`; `apps/web` manda ISO |
| P2c | `startTime`/`endTime` de un turno que no son texto responden `message: ["INVALID_DATE"]` (validación) en lugar de `message: "INVALID_DATE"` | En Nest el `Transform` deja pasar el valor y lo rechaza el handler; en Go el tipo se comprueba al leer el cuerpo. Mismo 400 y mismo código |
| P2c | `latitude`/`longitude` como texto (`"40.4"`) responden 400 `INVALID_TYPE` | `@IsLatitude` acepta texto, pero luego Prisma falla con un 500 al guardarlo en un `Float` |
| P2c | En la hoja de horas, los días de la misma fecha se ordenan por nombre sin distinguir mayúsculas, no con `localeCompare` | Go no tiene la collation de ICU sin `golang.org/x/text`; solo cambia el orden con acentos (`Álvaro` va después de `Zoe`) |
| P2c | `reason` cuenta caracteres (runas) para `min=5`/`max=500`, no unidades UTF-16 | Es lo que hace validator; solo cambia con emojis y otros caracteres fuera del plano básico |

## Comprobar que Go se comporta igual que Nest

Los e2e de `apps/api/test` usan `supertest`, que acepta una URL en lugar de la app de Nest.
Para lanzarlos contra el servidor Go:

1. Cambiar `testSetup.app.getHttpServer()` por la URL del servidor Go cuando haya una
   variable de entorno (por ejemplo `E2E_BASE_URL`). Sin ella, siguen yendo contra Nest.
2. Cambiar el `mockUser`, que hoy se salta el `AuthGuard`, por un JWT firmado de verdad con
   el secreto de test.
3. Prisma puede seguir preparando los datos de prueba, porque la base de datos es la misma.

Así los 32 archivos e2e sirven para comprobar la paridad sin reescribirlos.

Hecho en P4: cómo se lanza y qué falta en Go está en «Convenciones de P4».

## Riesgos

- **El contrato de la API tiene que ser idéntico**: rutas (`/api/v1/...`), forma del JSON,
  cuerpo de los errores de Nest (`statusCode`, `message`, `error`), los `ErrorCodes` de
  `@coaster/common`, los errores de validación y las cookies. Si algo cambia, se rompe `apps/web`.
- **Contraseñas**: argon2 en Go tiene que verificar los hashes existentes.
- **Tokens**: mismos claims y mismo secreto, para que nadie tenga que volver a iniciar
  sesión al hacer el cambio.
- **Migraciones**: goose empieza en P5 desde el esquema de ese momento. Los triggers de `TimeEntry` y el
  índice parcial de `ShiftExchange` ya están en las migraciones SQL, así que no se pierden.
  La tabla `_prisma_migrations` deja de usarse.
- **Tipos compartidos** (`@coaster/common`): siguen en TypeScript y hay que mantenerlos a
  mano o generarlos desde OpenAPI.
- **IA**: queda por confirmar cómo pasar los modelos de respaldo al AI Gateway sin el SDK de Vercel.

## Costes en Cloud Run

- Alrededor del 90–95 % del precio de una instancia es **CPU**, así que usar menos RAM
  ahorra poco. Lo que ahorra es **tener menos instancias**.
- Hoy cada stream SSE ocupa 1 de los **80 huecos de concurrencia**, así que sale una
  instancia nueva cada ~8 locales. Con concurrencia a 1000 o más, una instancia aguanta
  unos 100. Esto también se puede hacer en Nest.
- Go usa todos los vCPU de la instancia; Node solo uno.
- Con **una sola instancia** no hace falta Redis (ver `docs/operations/redis.md`), y Go
  hace que esa instancia dé para mucho más.
- Arranque en frío de menos de 200 ms, así que `min-instances 0` es aceptable.
- Pendiente: calcular el ahorro real con la factura de GCP desglosada (Cloud Run, base de
  datos, Redis e IA).
