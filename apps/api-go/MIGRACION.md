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
  externos y `EventPublisher`. Los handlers reciben una interfaz pequeña, declarada en el
  propio handler, con solo los métodos del servicio que usan (`OrderService` en
  `order_handler.go`); `main.go` les pasa el `*service.XService` de siempre.
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
- **Confirmar los modelos de respaldo del AI Gateway** sin el SDK de Vercel (P3). Go los manda
  como `providerOptions.gateway.models` en el cuerpo, que es lo que documenta el gateway para su
  API compatible con OpenAI; falta verlo con la clave de verdad (ver «Convenciones de P3»).
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
| P1 Auth y permisos | ✅ Hecho | `/auth` y `/account` completos (registro, login, Google, refresh con rotación y detección de reutilización, recuperación, verificación, invitaciones, sesiones, identidades), JWT, argon2 compatible con `@node-rs/argon2`, guard de rutas (rate limit, suscripción, auth, admin, permisos, módulos), caché y rate limit en Redis con respaldo en memoria, bloqueo de login, Have I Been Pwned, email a log o al buzón de test. `test/auth` pasa contra Go; El refresco desde Stripe (`SubscriptionRefresher`) y Resend llegaron con P2e; `test/permissions` y `test/modules` ya pasan contra Go |
| P2a Catálogo | ✅ Hecho | Categorías, productos (con `AdjustStock` para pedidos e IA), catálogo inicial, carta (borrador, publicar, carta pública por `slug` con `lang` y agotados) y URLs firmadas de subida a GCS (`adapter/storage`, cliente perezoso). Eventos `Category*`, `Product*` y `CatalogueImportedEvent` con su suscriptor de realtime. `test/categories`, `test/products`, `test/catalogue` y `test/menu` pasan contra Go |
| P2b-1 Locales y usuarios | ✅ Hecho | Crear un local (una transacción con el local, su OWNER, la suscripción FREE en prueba de 14 días y los ajustes con los módulos por defecto y el idioma del usuario), los locales del usuario, un local (`null` si no existe) y sus ajustes (los de por defecto sin fila; guardarlos pide `ESTABLISHMENT_MANAGE_SETTINGS` y los marca configurados). `GET /users/me` (`null` sin sesión) y `PATCH /users/me` (nombre, foto e idioma). Eventos `EstablishmentSettingsUpdated`, que olvida los módulos cacheados, y `UserUpdated`, cuyo suscriptor olvida el usuario y su rol también cuando lo publica admin. `test/establishments` y `test/users` pasan contra Go; en `test/modules` pasan los de ajustes y solo fallan los de mesas, pedidos y miembros |
| P2b-2 Miembros e invitaciones | ✅ Hecho | `/establishments/{establishmentId}/members`: `GET me` (con el propietario inventado de un admin), `GET`, invitar (la cadena de sagas de Nest es `EstablishmentMemberService.Invite`: quién concede OWNER, «ya es miembro», usuario por email y miembro en una transacción), reenviar la invitación, cambiar el rol y quitar (borrado lógico). Eventos `MemberInvited`, `MemberRemoved` y `MemberRoleChanged` con sus suscriptores: caché de la membresía, email de invitación, realtime (con `Revoke` al quitar), `AdminAction` cuando un admin de la plataforma cambia un rol, y `SyncSeatsOnMemberChange` al invitar y al quitar. Para P3: `List`, `Invite` y `Remove` son `GetMembersQuery`, `InviteMemberCommand` y `RemoveMemberCommand`. `establishment-members` y `member-roles` pasan contra Go; `access-revocation` necesita `GET /establishments` (P2b-1) y `GET /orders` (P2d-1) |
| P2b-3 Admin | ✅ Hecho | `/admin/overview` (métricas), `/admin/audit`, `/admin/users` (lista, detalle y cambio de rol o activación), `/admin/beta-testers` (lista, alta y baja) y `/admin/establishments` (lista con filtros de facturación, detalle con ajustes, suscripción, miembros, contadores y actividad, renombrar, módulos, y conceder y revocar un plan a mano). SQL propio para leer usuarios, miembros, suscripciones, pedidos, mesas, catálogo y ajustes. `AdminAuditService.RecordAction` guarda cada `AdminAction` (también los de P2b-2); conceder o revocar publica `SubscriptionOverridden`, cambiar un usuario `UserUpdated` y cambiar los módulos olvida su caché. `test/admin`: 20 pasan contra Go, 3 esperan a `/members` (P2b-2) y `/tables` (P2d-1), y «should let a lapsed establishment write again» se salta contra Go (ver «Convenciones de P4»). No está en `e2e-paquetes.txt`: lo añade el orquestador en la integración |
| P2c Turnos y fichajes | ✅ Hecho | Turnos, intercambios (traspaso en una transacción) y fichajes: fichar, alta manual, corrección y anulación como revisiones, cadena de hashes compatible con Nest con el mismo advisory lock, jornadas con el cuadrante y sus discrepancias, hoja de horas, CSV e integridad. Realtime de `ShiftCreated/Deleted` y auditoría de los fichajes que toca un admin. `test/shifts` y `test/time-tracking` pasan contra Go |
| P2d-1 Pedidos y mesas | ✅ Hecho | `orders` (16 rutas) y `tables` (4), todas con el módulo ORDERS. Las nueve transacciones de Nest viven en `OrderRepository`: el bulk bloquea el pedido con `FOR UPDATE`, el checkout lo reclama con un `UPDATE … WHERE status = 'OPEN'` y el estado de la mesa cambia en la misma transacción. Totales con `CalculatePricing`, los 11 eventos de pedidos y los 3 de mesas, stock como `orders.sagas.ts` (`OrderStock`, con `ProductService.AdjustStock`) y realtime de `order-*`, `orders-merged` y `table-*` (`OrderRealtime`). `test/orders` y `test/tables` pasan contra Go; lo que usan P2d-3 y P3 está en «Convenciones de P2d-1» |
| P2d-2 Impresoras | ✅ Hecho | Rutas del puente sin usuario (`/printer`: `check-version` con el sha256 de `public/downloads`, `download`, `pair`, `register-ip`, `jobs/next` con long-poll de 25 s y `jobs/{jobId}/result`), autenticadas con `X-Device-Key` comparada en tiempo constante, y del local con el módulo ORDERS (`/establishments/{id}/printer`: `jobs`, `jobs/{jobId}`, `connection`, `status`, `pairing` y `device-key`). Reclamar un trabajo es buscar y actualizar si sigue `PENDING`; los reclamados sin resultado vuelven a la cola a los 2 min o fallan al tercer intento. El token de `connection` (HS256 `{establishmentId}`, 8 días) lo valida un test con la comprobación de `apps/printer-service`. `config.Load` exige `PRINTER_JWT_SECRET` y el long-poll se suelta al apagar (`PrinterService.StopWaiting`). `test/printer` y `test/printers` pasan contra Go |
| P2d-3 Cierres de caja y estadísticas | ✅ Hecho | Ola 3b. `/establishments/{id}/cash-closes` (lista de los 60 últimos, `preview` y cierre en una transacción con `FOR UPDATE` del local) y `/establishments/{id}/stats` (sin módulo; el histórico según `EstablishmentPermissionsOf`). `CashCloseTotalsOf`, arqueo y `EstablishmentStatsOf` en el dominio, comprobados contra Nest con los mismos pedidos, en UTC y en `Europe/Madrid`. SQL propio sobre `"Order"`, `"OrderItem"` y `"OrderAdjustment"`. Para P3: `StatsService.EstablishmentStats(ctx, establishmentID, includeHistory)` es `GetEstablishmentStatsQuery` (en `main.go`, `statsService`). `test/cash-closes` y `test/stats` crean pedidos por HTTP: quedan fuera de `e2e-paquetes.txt` hasta la integración con P2d-1 (los tests que no usan pedidos ya pasan contra Go) |
| P2e Cobros | ✅ Hecho | `/establishments/{id}/establishment-subscription` (lectura, asientos, Checkout y portal), `/stripe/webhook` con firma, refresco desde Stripe (`SubscriptionRefresher` ya cableado), sincronización de asientos como método (`SyncSeatsOnMemberChange`, falta suscribirlo a los eventos de miembros de P2b), eventos `Subscription*` y `DuplicateSubscriptionDetected` con sus suscriptores (caché, realtime y log), y emails con Resend. Ningún directorio de `apps/api/test` es solo suyo: el test del portal de `test/permissions` pasa contra Go |
| P2f Realtime | ✅ Hecho | `GET /establishments/{establishmentId}/events` (SSE con `: open`, heartbeat de 25 s, cierre a los 30 min y `Last-Event-ID`), `service.RealtimeService` (implementa `ports.Realtime`: registro de streams por local, `Publish`, `Revoke`), bus en Redis compatible con Nest (canal `coaster:realtime`, replay de 2 min en `realtime:<id>:replay`), sin Redis solo en este proceso, cierre de streams al apagar. `test/realtime` pasa contra Go (publicar y revocar, en los tests de Go). Los suscriptores de `realtime/events/handlers/` los escribe cada paquete |
| P3 IA | ✅ Hecho | Ola 4. `/establishments/{establishmentId}/ai`: `GET usage`, `POST` (201) y `POST stream` (SSE con `delta` y `done`), con solo auth, ser miembro y 20 por minuto. `AIService.Execute` es `ExecuteAiCommand`: membresía, cuota por local y mes en `AiUsage` (500, o 100 en prueba; cuenta solo tras una respuesta), módulos, instantánea y el mismo prompt de sistema, los 10 últimos mensajes y `zai/glm-4.7` a 0.1 con 8 pasos y sus cuatro modelos de respaldo. `adapter/ai.Gateway` habla con la API compatible con OpenAI del AI Gateway con openai-go y hace lo del AI SDK: el bucle de herramientas, la comprobación de su entrada como zod y el streaming. Las 40 herramientas (`service/ai_tools_*.go`) llaman a los servicios de P2 con los permisos, `confirmed`, textos y euros/céntimos de Nest; sus respuestas, esquemas y el prompt se comparan byte a byte con lo que da Nest (`service/testdata`). `test/ai` pasa contra Go. **Pendiente de Miguel**: confirmar los modelos de respaldo con la clave de verdad. Posibles bugs de Nest copiados tal cual: en el stream cualquier error (también `AI_QUOTA_EXCEEDED` y `MEMBER_NOT_FOUND`) llega como `ai_gateway_failed` y `apps/web` no lo distingue; la cuota se mira antes y se cuenta después, así que varios mensajes a la vez pueden pasarla; si falla contar el mensaje se responde el error del gateway aunque las herramientas ya se ejecutaron; `createOrder` y `addOrderItems` quitan en silencio los productos que no están en la instantánea y responden éxito; las mesas y productos de los pedidos se nombran con la instantánea del turno (`deleteOrder` de un pedido cerrado siempre confirma la mesa «No table»); `getOrdersByDate` suma `totalAmount` (sin IVA ni descuentos) mientras cada pedido enseña `orderTotal`; `updateProduct` acepta precios negativos |
| P4 Arnés e2e | ✅ Hecho | `E2E_TARGET=go` lanza los e2e de `apps/api` contra Go: el `globalSetup` compila el binario, cada archivo arranca su servidor detrás de un proxy que pone `/api/v1` y un JWT de verdad, buzón de test y claves de Google por HTTP, `e2e-paquetes.txt`, `scripts/e2e-go.sh` y job de CI `api-go-e2e`. Lo que falta en Go está en «Convenciones de P4» |
| Interfaces en los handlers | ✅ Hecho | Los 25 handlers de P2 y P3 reciben una interfaz declarada en su archivo con los métodos que usan. Se llama como el servicio salvo choque: `PrinterConnectionService` (`printer_connection_handler.go`), `EstablishmentSubscriptionService` y `StripeWebhookService` (los dos sobre `SubscriptionService`). Sin cambios en `main.go` ni en los tests |
| P5 Salida | ⬜ Pendiente | |

## Siguiente paso

P2 y P3 están completos: los 22 directorios de tests de `apps/api/test` pasan contra Go
(`e2e-paquetes.txt`). Queda:
1. **Confirmar los modelos de respaldo del AI Gateway** con la clave de verdad (Miguel, antes de
   P5): cómo probarlo está en «Convenciones de P3».
2. **Revisión de Miguel** de la ola 3b, de P3 y de «Posibles bugs de Nest copiados tal cual».
3. **P5 Salida**: no la hacen los agentes.

## Convenciones de P0

Lo que P0 deja hecho y cómo se usa desde P1 en adelante.

**Arrancar y probar**
- `go vet ./...` y `go test ./...` desde `apps/api-go`. Los tests de `repository/` levantan
  `postgres:18-alpine` con testcontainers, así que necesitan Docker.
- En local con Docker: `docker compose up db redis api-go`. Go escucha en
  `http://localhost:3001` y Nest sigue en el 3000, contra la misma base de datos. El servicio
  carga `apps/api/.env` (las variables son las mismas que las de Nest) y fija en `compose.yaml`
  las que son de Go (`PORT`, `PUBLIC_DIR`, `PUBLIC_URL`) para que las de Nest no las pisen.
  Las migraciones las aplica el servicio `api` de Nest; con una base vacía y sin él:
  `docker compose run --rm api npx prisma migrate deploy`.
- En local sin Docker: `apps/api-go/scripts/dev.sh`. La primera vez crea `apps/api-go/.env` a
  partir de `apps/api/.env` (`scripts/env-local.sh`, que se puede volver a lanzar si cambia) y
  arranca `go run ./cmd/api` en el 3001. Qué lee Go está en `apps/api-go/.env_example`; las
  obligatorias son `DATABASE_URL`, `AUTH_JWT_SECRET` y `PRINTER_JWT_SECRET`.
- La web contra Go: `API_URL=http://localhost:3001 docker compose up web` (o
  `API_URL=http://localhost:3001 npm run dev:web`).

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
| `ai` | `vi.mock('ai')` | Nada: el test acepta 201 o 500. Sin `AI_GATEWAY_API_KEY` Go no llama al gateway y responde 201 con el error traducible, como Nest cuando el SDK falla. La respuesta del modelo se prueba en los tests de Go (`adapter/ai`, con un servidor falso compatible con OpenAI) | P3 |
| `admin` | `MockAuthGuard` deja pasar a un usuario inactivo y no manda token | «should refuse demoting the last admin» se salta en modo Go: con un token de verdad es un 401. «should let a lapsed establishment write again, and stop it once revoked» también: con token, `SubscriptionActiveGuard` deja escribir al admin en un local caducado y los 402 son 201 (el flujo se ha comprobado contra Go con el dueño del local) | — |
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
  integración. Hecho: todos pasan contra Go.
- Con varios agentes en la misma máquina, cada uno lanza los e2e con su propio `TMPDIR` (ver
  «Convenciones de P2c») y enlaza el `node_modules` del checkout principal en su worktree en
  lugar de instalarlo otra vez.

**Empujar**
- Un solo push por subpaquete: `git pull --rebase origin dev`, volver a pasar `go vet`,
  `go test ./...` y `scripts/e2e-go.sh`, y `git push origin dev`.
- Al hacer rebase, en `main.go`, `router.go`, `e2e-paquetes.txt` y `MIGRACION.md` se quedan las
  líneas de los dos lados.

## Convenciones de P2d-1

**Servicios** (un método por comando o consulta de Nest). Los comandos devuelven solo `error`,
como el `void` de Nest: para leer cómo queda un pedido, `Get`.
- `service.OrderService`:
  - `List(ctx, establishmentID, status)` es `GetOrdersByEstablishmentIdQuery`: los pedidos, del
    más nuevo al más viejo. Con `status` vacío, todos; la IA pide `domain.OrderOpen`.
  - `ListByDate(ctx, establishmentID, "2026-09-27")` es `GetOrdersByDateQuery` (el día en UTC).
  - `Get(ctx, establishmentID, orderID)` es `GetOrderByIdQuery`.
  - `Create(ctx, establishmentID, CreateOrderInput{CreatedByID, TableID, Items, Notes,
    Adjustments, TipAmount})`; `CreatedByID` es quien abre el pedido (`""` para nadie).
  - `AddItems(ctx, establishmentID, orderID, AddOrderItemsInput{Items, Notes, ClearNotes})`.
  - `BulkUpdate(ctx, establishmentID, orderID, []domain.OrderItemUpdate)`: servir y cobrar
    líneas (`PaidQuantity`, `ServedQuantity` y `PaymentMethod`; `nil` deja el campo como está).
  - `Checkout(ctx, establishmentID, orderID, domain.PaymentCash o domain.PaymentCard)`,
    `Cancel(ctx, establishmentID, orderID)`, `MoveTable(ctx, establishmentID, orderID, tableID)`,
    `Merge(ctx, establishmentID, MergeOrdersInput{OrderIDs, TargetTableID})`,
    `RemoveItem(ctx, establishmentID, orderID, itemID)`, `Delete(ctx, establishmentID, orderID)`,
    `UpdateTip(ctx, establishmentID, orderID, céntimos)`, `UpdateNotes`, `UpdateItemNotes`,
    `AddAdjustment(ctx, establishmentID, orderID, OrderAdjustmentInput{Target, Type, Value,
    Reason, ItemID})` y `RemoveAdjustment(ctx, establishmentID, orderID, adjustmentID)`.
- `service.TableService`: `List(ctx, establishmentID)`, `Create(ctx, establishmentID, name)`,
  `Update(ctx, establishmentID, tableID, *name)` y `Delete(ctx, establishmentID, tableID)`.
- Los servicios no miran permisos ni módulos: en HTTP los pone el guard y la IA (P3) los
  comprueba antes de llamar, como el `runner` de las herramientas de Nest. Sí comprueban todo lo
  demás (que el pedido sea del local, que siga abierto, cantidades, propina negativa…), porque la
  IA no pasa por los DTOs.
- Los errores son `domain.Error` con el código de Nest (`ORDER_NOT_FOUND`, `ORDER_NOT_OPEN`,
  `TABLE_ALREADY_OCCUPIED`…) o con uno de los textos sueltos de `domain.Message*`
  (`NEGATIVE_TOTAL_NOT_ALLOWED`, `Adjustment not found`…), que Nest manda sin código.

**Dinero y totales**
- Todo va en céntimos. `domain.Order` trae los totales de `CalculatePricing` (`netTotal`,
  `taxBreakdown`, `orderTotal`, `payableTotal`…), y `OrderRow.Pricing()` los calcula desde una fila.
- Al cobrar, `amountPaidCash` y `amountPaidCard` guardan lo cobrado con IVA y descuentos **y con
  la propina**, que además está en `tipAmount`: lo facturado es `amountPaidCash + amountPaidCard -
  tipAmount`, como en `get-establishment-stats` de Nest. El bulk suma cada unidad pagada al precio
  de su línea con descuentos e IVA.
- Un pedido con `cashCloseId` no se puede borrar (`ORDER_IN_CASH_CLOSE`); esa columna la escribe
  P2d-3 con su propio SQL.

**JSON y base de datos**
- Las fechas de `Order`, `OrderItem` y `OrderAdjustment` son `domain.Instant`, porque el mapper de
  Nest usa `Temporal.Instant.toString`; las de `Table` son `domain.Time` (`toISOString`).
- `productName` es el nombre actual del producto (no `productNameAtPurchase`), y `tableName` el
  que guarda el pedido o, si no tiene, el de su mesa.
- Comprobado contra Prisma: las líneas creadas a la vez comparten `createdAt` (y su orden entre
  ellas depende del `id`), y las escrituras anidadas (notas de una línea, añadir o quitar un
  ajuste) o vacías no tocan el `updatedAt` del pedido. Go hace lo mismo.

**Eventos**
- Están en `domain/order_events.go` y `domain/table_events.go`, con `Name()` igual a la clase de
  Nest. `OrderStock.Adjust` (suscrito a `service.OrderStockEvents`) mueve el stock y
  `OrderRealtime.Forward` (a `service.OrderRealtimeEvents`) manda el realtime. Quien tenga que
  reaccionar a un pedido cobrado se suscribe a `OrderClosedEvent`, que lleva el pedido ya cerrado.

**Validación**
- Regla nueva `percentage`, el `PercentageWithinRange` de `AddOrderAdjustmentDto`: si el campo
  `Type` del mismo struct es `PERCENTAGE`, el valor no pasa de 100.

## Convenciones de P3

**Dónde está cada cosa**
- `domain/ai.go`: `AIMessage`, `AIResponse`, `AIUsage` y `AIToolResult` (el `ToolResult` de las
  herramientas), `AIGatewayFailed` y los formateadores de la instantánea (`snapshot.ts`).
- `ports/ai.go`: `AIModel` (`Generate(ctx, AIRequest)`, que es `generateText`, o `streamText`
  con `OnDelta`), `AITool` (nombre, descripción, esquema JSON y `Run`) y `AIUsageRepository`.
- `adapter/ai`: `Gateway` implementa `AIModel` con openai-go contra
  `https://ai-gateway.vercel.sh/v1`. Hace lo que hacía el AI SDK: el bucle de pasos, comprobar la
  entrada de cada herramienta contra su esquema como zod (`tool_input.go`) y el streaming. El
  servicio no importa openai-go.
- `service/ai_service.go`: `AIService.Execute` (`ExecuteAiCommand`) y `Usage`
  (`GetAiUsageQuery`), el modelo, sus respaldos y el prompt de sistema (el texto de Nest tal cual,
  con `%s` donde Nest interpola).
- `service/ai_tools.go`: el contexto de un turno (`aiToolContext`), el runner de Nest
  (`tc.execute` para comandos, `aiQuery` para consultas, `aiConfirmation` para las destructivas) y
  `newAITool`. Las herramientas van por área en `ai_tools_<área>.go`.

**Añadir o cambiar una herramienta**
- La entrada es un struct: sin `omitempty` es obligatoria, con puntero y `omitempty` opcional;
  `jsonschema` lleva las reglas de zod (`minimum`, `maximum`, `enum`, `minItems`) y
  `jsonschema_description` el `.describe()`. `z.number().int()` es `int` con
  `minimum=-9007199254740991,maximum=9007199254740991` (o su mínimo), como lo escribe zod.
- `newAITool(nombre, descripción, func(ctx, input T) domain.AIToolResult)`. Dentro, lo que Nest
  comprueba antes del runner (`failed(...)`) va con `aiFailed`, y la llamada al servicio con
  `tc.execute(permiso, confirmación, func() error {...})` o `aiQuery(tc, permiso, consulta, proyección)`.
  Las proyecciones son structs con los nombres JSON de Nest; el dinero va en euros con `toEuros` y
  vuelve con `toCents` (`Math.round`).
- `service/testdata/nest_ai_tools.json` (esquemas y descripciones) y `nest_ai_answers.json`
  (respuestas y prompts) se sacaron ejecutando el código de `apps/api/src/ai` con un spec de vitest
  temporal: `getAiTools(...)` con buses falsos y los datos de `newAIFixture`, y `inputSchema.jsonSchema`
  de cada herramienta. Si Nest cambia una herramienta, se vuelven a sacar igual.

**Probar**
- El bucle se prueba en `adapter/ai/gateway_test.go` con un `httptest.Server` compatible con OpenAI
  que pide herramientas y devuelve texto, con y sin streaming.
- Las herramientas y el prompt, en `service/ai_*_test.go` con los servicios reales y los fakes de P2.
- **Los modelos de respaldo, a mano y con la clave de verdad**: con `AI_GATEWAY_API_KEY` puesta,
  mandar un mensaje y mirar en el panel del AI Gateway que la petición lleva los modelos de
  respaldo (o forzar un modelo principal que no exista y ver que responde uno de los de respaldo).
  Si el gateway no los lee por `providerOptions.gateway.models`, probar `models` en la raíz del
  cuerpo: es cambiar `SetExtraFields` en `Gateway.Generate`.
- La URL del gateway no se puede cambiar por entorno: los e2e no llaman al modelo (sin clave, el
  gateway falla sin llamar y la ruta responde 201 con el error).

## Ejecución con agentes

Los paquetes los ejecuta un agente orquestador que lanza subagentes. Se hace en olas:

| Ola | Paquetes | Cómo |
|---|---|---|
| 1 | P0 | Un solo agente: es la base y tiene que ser coherente. |
| 2 | P1 y P4 | Dos subagentes en paralelo. |
| 3 | P2a, P2c, P2e y P2f | Subagentes en paralelo. P2b y P2d no llegaron a empezar. |
| 3b | P2b-1, P2b-2, P2b-3, P2d-1, P2d-2 y P2d-3 | Seis subagentes en paralelo, cada uno en su git worktree, sin push; el orquestador integra sus commits en `dev` (cherry-pick, conflictos de `main.go`, `router.go`, `e2e-paquetes.txt` y `MIGRACION.md` quedándose con los dos lados) y pasa los e2e que necesitan a varios. Iba a ser una sesión en la nube por subpaquete, pero `create_session` no deja crear una sesión hija más permisiva que la que la crea. |
| 4 | P3 | Un subagente, con toda la ola 3b ya en `dev`. |

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
| P2b-1 | En `PATCH /users/me`, `name: null` se ignora; Nest lo deja pasar y Prisma responde 500. `photoUrl: null` vacía la foto, igual que en Nest | Como en P2a: solo se lee el `null` de las columnas que lo admiten |
| P2b-1 | El nombre de un local cuenta caracteres (runas) para `min=3`/`max=50`, no unidades UTF-16 | Es lo que hace validator; solo cambia con emojis y otros caracteres fuera del plano básico |
| P2b-1 | Un elemento de `modules` que no es texto (`{"modules":[1]}`) responde `each value in modules must be a string` en lugar de `INVALID_TYPE` | Mismo 400. El texto para un tipo equivocado es uno por campo: con `INVALID_TYPE`, un `modules` que falta dejaría de responder `modules must be an array`, que es el primer mensaje de Nest y el que enseña `apps/web` |
| P2b-2 | Invitar guarda el usuario y el miembro antes de responder y en una transacción: cuando llega el 201 el invitado ya está en la lista, y un fallo al guardar (por ejemplo, un local que no existe, que solo puede pedir un admin de la plataforma) responde 500 sin dejar nada a medias | En Nest `InviteMemberCommand` solo publica un evento y la cadena de sagas (usuario y después miembro) corre después del 201: un fallo queda en el log y puede dejar el usuario creado sin miembro. Por eso los e2e esperan con `waitForMembers` |
| P2d-3 | Las notas de un cierre de caja se cortan a 500 caracteres (runas), no a 500 unidades UTF-16: Nest valida 500 caracteres y luego guarda `substring(0, 500)`, así que con emojis guarda menos de lo que dejó pasar | Solo cambia con emojis y otros caracteres fuera del plano básico |
| P2d-2 | El token de `GET printer/connection` lleva los claims en el orden `establishmentId`, `exp`, `iat` (Nest: `establishmentId`, `iat`, `exp`) | Es el orden en que golang-jwt escribe `RegisteredClaims`; el puente lee los mismos claims y la misma firma HS256 |
| P2d-2 | `GET printer/jobs/next` deja de esperar si el puente cuelga o si el servidor se apaga (responde 204). Nest sigue mirando la cola los 25 s y puede reclamar un trabajo para una conexión cerrada, que se queda `PRINTING` hasta que vuelve a la cola a los 2 min | Así el apagado no espera 25 s por cada puente conectado y no se pierden tickets en conexiones muertas |
| P2d-2 | Un `null` en un campo opcional del ticket (`POST .../printer/jobs`) no se guarda: el puente recibe el ticket sin esa clave en lugar de con `"clave": null` | El ticket se guarda desde un struct con `omitempty`; el puente trata igual un `null` y una clave que falta, y `apps/web` no manda `null` |
| P2d-2 | `type` (`POST .../printer/jobs`) y `status` (`printer/jobs/{jobId}/result`) que faltan o no son texto responden `must be a string` en lugar de `must be one of the following values: …` | El texto de un valor que falta o es de otro tipo sale del tipo (P0), y la etiqueta `msg` no admite comas |
| P2d-2 | El motivo de un fallo de impresión se corta a 500 caracteres (runas), no unidades UTF-16 | Como en P2a; solo cambia con emojis |
| P2d-2 | `os=constructor`, `os=toString` y demás nombres de `Object.prototype` en `check-version` y `download` responden 400; en Nest, 500 | Bug de Nest que no se copia: `BINARIES[os]` encuentra la función del prototipo y `join` falla |
| P2d-2 | Un parámetro de query repetido (`?os=a&os=b`, `establishmentId`, `code`) se lee como el primero; en Nest llega como array y la ruta responde 400 o 500 | `URL.Query().Get` devuelve el primer valor; ningún cliente repite parámetros |
| P2b-3 | `PATCH /admin/establishments/{id}/modules` olvida la caché de módulos del local después de guardar | Nest no la olvida, y con Redis el cambio tardaba hasta 8 h en llegar a los guards |
| P2b-3 | En `PATCH /admin/users/{id}`, un `active: null` junto a un cambio de rol se ignora; Nest pasa el `null` a Prisma y responde 500 | Como en P2a: un campo que no admite nulos no distingue `null` de ausente |
| P2b-3 | `page` y `pageSize` de la query se leen con `strconv.ParseFloat`: `0x10`, `0b1` u `0o7` son `INVALID_TYPE` (`Number()` los acepta) y una página por encima de 2^53 se queda en 2^53 | Nadie los manda así; los enteros, decimales y el vacío se leen como `Number()` |
| P2b-3 | Las longitudes máximas (`q`, `targetId`, `email`, `note`, `name`, `reason`) cuentan caracteres (runas), no unidades UTF-16 | Como en P2c; solo cambia con emojis y otros caracteres fuera del plano básico |
| P2d-1 | `GET /orders?date=` solo lee `YYYY-MM-DD`; cualquier otra cosa responde 500, como una fecha que `Temporal.PlainDate.from` no entiende | `PlainDate.from` acepta además fecha y hora y otras formas ISO; `apps/web` y la IA mandan `YYYY-MM-DD` |
| P2d-1 | `null` en `notes`/`ticketNotes` de `PATCH /orders/{id}/notes` o en `name` de `PATCH /tables/{id}` se ignora como si no viniera; Nest responde 500 (`.trim()` de `null`, o Prisma con `null` en una columna que no lo admite) | El mismo criterio que P2a; `apps/web` manda texto. En `POST /orders/{id}/items`, `notes: null` sí vacía las notas, como en Nest |
| P2d-1 | Las notas del pedido y de las líneas y el motivo de un ajuste se cortan a 500 caracteres (runas), y `@MaxLength(500)` también cuenta runas, no unidades UTF-16. `trim` no quita el BOM (U+FEFF) | Solo cambia con emojis y otros caracteres fuera del plano básico |
| P2d-1 | Los ajustes de un pedido salen ordenados por `createdAt` e `id` | Nest los pide sin `orderBy` y salen en el orden en que Postgres los devuelva |
| P2d-1 | En `orderIds` de `POST /orders/merge`, cada id que no es UUID da su propio `INVALID_TYPE`; class-validator da uno por campo | validator comprueba cada elemento con `dive`. Viene de P0 y pasa igual con cualquier `{ each: true }` |
| P3 | **Pendiente de confirmar por Miguel.** Los cuatro modelos de respaldo van en el cuerpo de la API compatible con OpenAI como `providerOptions: {gateway: {models: [...]}}`; Nest los pasa con las `providerOptions` del proveedor `gateway` del AI SDK | Sin el SDK de Vercel no hay proveedor `gateway`. Es lo que documenta el AI Gateway para Chat Completions (también acepta `models` en la raíz del cuerpo), pero no se ha podido probar sin la clave de verdad. Si el gateway no los leyera, Go solo usaría `zai/glm-4.7` |
| P3 | Go habla con el gateway por su API compatible con OpenAI (Chat Completions); Nest, con el protocolo propio del proveedor `gateway` del AI SDK. El razonamiento que devuelva el modelo no vuelve en los pasos siguientes | Es la API que se puede usar con openai-go (`LIBRERIAS.md`); el texto, las herramientas y sus resultados son los mismos |
| P3 | Las herramientas que el modelo pide en un mismo paso se ejecutan una detrás de otra, en su orden; el AI SDK las lanza a la vez | Mismos resultados sin escrituras a la vez sobre el mismo pedido o mesa |
| P3 | El texto que recibe el modelo cuando la entrada de una herramienta no cumple su esquema imita el de zod (`Invalid input for tool …: Type validation failed: …` con sus issues), pero el orden de los campos de cada issue puede cambiar, falta el `note` de un entero fuera del rango seguro y el error de un JSON roto es el de Go | La comprobación se escribe a mano sobre el esquema; el modelo solo lo lee para corregirse |
| P3 | Un cuerpo de `POST ai` con `messages` que no es una lista se trata como si no viniera (se usa `prompt`) y un mensaje con campos de otro tipo los lee vacíos; en Nest lo primero es un `TypeError` (500, o el `done` de error en el stream) y lo segundo el error del gateway | El cuerpo no tiene DTO en Nest y `apps/web` siempre manda texto y una lista |
| P3 | `AI_MONTHLY_MESSAGES` o `AI_TRIAL_MONTHLY_MESSAGES` que no son un entero usan el valor por defecto; en Nest `Number()` da `NaN`, la cuota nunca se agota y `GET usage` responde `null` | Bug de Nest que no se copia. Un `0` sí apaga el asistente, como en Nest |
| P3 | Sin `AI_GATEWAY_API_KEY` Go falla sin llamar al gateway; el AI SDK aún prueba el token OIDC de Vercel | La API no corre en Vercel; la respuesta es la misma (201 con el error traducible) |
| P3 | `POST ai/stream` manda las cabeceras en cuanto empieza; Node las manda con el primer `delta` o con el `done` | Así el cliente no espera sin respuesta mientras el modelo piensa; las cabeceras son las mismas |
| P3 | El error de una herramienta que no es de negocio (la base de datos caída, una fecha imposible en `getOrdersByDate`) lleva el texto del error de Go, no el de Prisma o Temporal | Como en el resto de paquetes; los errores con código de `ErrorCodes` son idénticos y llevan `errorKey` |

## Posibles bugs de Nest copiados tal cual

Para que Go se comporte igual que Nest, estos comportamientos se han copiado aunque parezcan
bugs. Si se arreglan, mejor en los dos a la vez (o en Go después de P5) y con un e2e que lo cubra.
Lo que Go sí hace distinto está en «Diferencias conocidas».

| Paquete | Qué pasa |
|---|---|
| P2b-1 | `PATCH /users/me` acepta cualquier texto en `language` (`"fr"`) y `name: ""` |
| P2b-1 | Un admin de la plataforma sobre un local que no existe: `GET /establishments/{id}` da 200 `null`, `GET …/settings` los ajustes por defecto y `PATCH …/settings` un 500 (clave foránea) |
| P2b-2 | Invitar a un usuario que ya existe le cambia el `name` por lo que va antes de la `@`, sin publicar `UserUpdated` (la caché se queda con el nombre viejo) |
| P2b-2 | El email de la invitación dice que invita el propio invitado: `MemberInvitedEvent.inviterName` lleva su nombre (al reenviar sí va el de quien invita) |
| P2b-2 | El email de la invitación no se pasa a minúsculas: invitar a `Ana@X.com` cuando existe `ana@x.com` crea otro usuario, que luego no puede entrar con contraseña |
| P2b-2 | Volver a invitar a un miembro quitado sin `role` le devuelve su rol antiguo: un MANAGER puede devolver a un ex-OWNER como OWNER |
| P2b-2 | Reenviar la invitación mira si el usuario está activo, no el miembro |
| P2b-3 | `memberCount` y `establishmentCount` cuentan membresías eliminadas e inactivas, y la búsqueda de locales por email encuentra miembros eliminados |
| P2b-3 | `billingSource` STRIPE en el filtro es tener `stripeSubscriptionId` aunque haya caducado; en la fila exige periodo vigente |
| P2b-3 | `manualPlan = FREE` cuenta como concesión viva en el filtro MANUAL y en las métricas, pero no para `isManualGrantActive` |
| P2b-3 | PAST_DUE: el backoffice lo muestra sin acceso, pero el guard deja escribir |
| P2b-3 | La métrica `admins` cuenta admins inactivos; renombrar valida la longitud antes del `trim` y no publica ningún evento; `/admin/audit` ordena solo por `createdAt` y la paginación puede repetir o saltarse filas |
| P2d-1 | `cancel` y `move-table` no son condicionales: un cancel a la vez que un cobro puede cancelar un pedido ya cobrado y devolver su stock |
| P2d-1 | Borrar un pedido abierto responde 400 `ORDER_NOT_OPEN`; mover un pedido a su misma mesa da `TABLE_ALREADY_OCCUPIED` |
| P2d-1 | `merge`: un pedido de otro local da 400 `ORDER_NOT_FOUND` y uno que no existe 404; no mira si la mesa destino está libre |
| P2d-1 | `AddAdjustment` compara el total neto (`totalAmount`) con `orderTotal`, que lleva IVA; un ajuste ORDER guarda el `itemId` si llega, y los de un pedido nuevo pueden apuntar a líneas de otro |
| P2d-1 | `?status` no se valida (un valor desconocido da 500) y en el bulk `MIXED` y `NONE` cuentan como efectivo |
| P2d-2 | `check-version` responde 400 «Unsupported OS» también cuando falta el binario; el sha256 se guarda hasta reiniciar; el código de emparejamiento se valida antes del `trim` y las mayúsculas |
| P2d-2 | Si otro puente se lleva el trabajo, `claimNext` espera un segundo en vez de probar el siguiente; los trabajos colgados solo vuelven a la cola cuando un puente pregunta; `POST pairing` sobre un local inexistente da 500 |
| P2d-3 | Las estadísticas agrupan por día, semana, mes y año en la zona del proceso (UTC en Cloud Run), no en `Europe/Madrid`: un pedido de las 00:30 cuenta el día anterior |
| P2d-3 | Las estadísticas cuentan cada pedido por `createdAt` (cuando se abrió), no por cuando se cobró |
| P2d-3 | La previsualización del cierre hace tres lecturas sin transacción; los cierres se ordenan solo por `closedAt`; cerrar la caja de un local inexistente da 500 |
| P3 | En el stream, cualquier error (también `AI_QUOTA_EXCEEDED` y `MEMBER_NOT_FOUND`) llega como `ai_gateway_failed` |
| P3 | La cuota se mira antes y se cuenta después: varios mensajes a la vez pueden pasarla. Si falla contar, se responde error aunque las herramientas ya se hayan ejecutado |
| P3 | `createOrder` y `addOrderItems` quitan en silencio los productos que no existen; `getOrdersByDate` suma `totalAmount` (sin IVA) y cada pedido muestra `orderTotal`; `updateProduct` acepta precios negativos |

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
- **IA**: queda por confirmar que el AI Gateway lee los modelos de respaldo que Go le manda por su API
  compatible con OpenAI (`providerOptions.gateway.models`).

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
