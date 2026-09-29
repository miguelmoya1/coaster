# Convenciones

Cómo está hecho `apps/coaster-api` y cómo se añade algo nuevo. Las carpetas están en
[estructura](estructura.md); lo que Go hace distinto de Nest, en «Diferencias conocidas» de [migración](migracion.md).

## Contrato HTTP

**Rutas**
- Cada handler registra sus rutas en su `RegisterRoutes(mux, guard)`, una línea por ruta con
  `handle(mux, guard, "MÉTODO /ruta", h.metodo, reglas...)` (`httpapi/routes.go`). `handle` pone
  el prefijo `/api/v1` y pasa la ruta por `Guard.Protect`: **ninguna ruta se registra sin el
  guard**, porque el rate limit y la comprobación de suscripción son globales, como en Nest.
- `main.go` pasa el handler a `httpapi.NewRouter`.
- Una ruta que no existe, o con otro método, responde el 404 de Nest (`Cannot GET /api/v1/x`).

```go
func (h *OrderHandler) RegisterRoutes(mux *http.ServeMux, guard *middleware.Guard) {
	handle(mux, guard, "GET /establishments/{establishmentId}/orders", h.list,
		middleware.Permissions(domain.PermissionViewOrders), middleware.Modules(domain.ModuleOrders))
}
```

**Reglas del guard** (el equivalente de cada decorador de Nest)

| Nest | Go |
|---|---|
| `@UseGuards(AuthGuard)` | `middleware.RequireAuth()` → 401 `INVALID_CREDENTIALS` sin token válido o con el usuario inactivo |
| `@UseGuards(OptionalAuthGuard)` | `middleware.OptionalAuth()` |
| `@UseGuards(AuthGuard, AdminGuard)` + `@Admin()` | `middleware.Admin()` (ya incluye la auth) → 403 `UNAUTHORIZED` |
| `@UseGuards(AuthGuard, EstablishmentPermissionsGuard)` + `@EstablishmentPermissions(a, b)` | `middleware.Permissions(a, b)` (ya incluye la auth). Sin argumentos solo pide ser miembro activo |
| `EstablishmentModulesGuard` + `@EstablishmentModules(m)` | `middleware.Modules(m)` → 403 `MODULE_NOT_ENABLED` |
| `@SkipSubscriptionCheck()` | `middleware.SkipSubscriptionCheck()` |
| `@Throttle({ default: { limit, ttl } })` | `middleware.Throttle(limit, ttl)`; sin ella, 300 por minuto |
| `@SkipThrottle()` | `middleware.SkipThrottle()` |

- El local es **siempre** el parámetro `{establishmentId}` de la ruta, como en Nest. Si la ruta
  lo llama de otra forma, el guard no lo ve.
- Las comprobaciones corren en el orden de Nest: rate limit, suscripción (solo escrituras con
  `{establishmentId}`, 402 con `errorCode`; un admin de la plataforma pasa), auth, admin,
  permisos (un admin de la plataforma los tiene todos) y módulos. El cuerpo se valida después,
  en el handler.

**Quién llama**
- `middleware.CurrentUser(r.Context())` → `*domain.User` (`@CurrentUser`); con `OptionalAuth`
  puede ser `nil`.
- `middleware.CurrentSession(r.Context())` → `*domain.SessionClaims` (`@CurrentSession`). Solo con
  `RequireAuth`, `Admin` o `Permissions`.
- `middleware.EstablishmentPermissionsOf(r.Context())` → los permisos en el local. Solo con
  `Permissions`.
- `middleware.ClientIP(r.Context())` → la IP según `TRUST_PROXY_HOPS` (`request.ip`).
- En los tests de un handler, `middleware.WithCurrentUser` mete el usuario.

**Cuerpos de petición** (`httpapi/request.go` y `validation.go`)
- `decodeJSON(r, &input)` con un struct con `json` y `validate`. `msg` cambia el texto de una
  regla, como el `{ message: ErrorCodes.X }` de class-validator; `type` es el texto para un valor
  que falta o es de otro tipo:
  ```go
  type createEstablishmentRequest struct {
  	Name  string  `json:"name" validate:"required,min=3,max=50" msg:"required=REQUIRED,min=MIN_LENGTH,max=MAX_LENGTH,type=INVALID_TYPE"`
  	Phone *string `json:"phone" validate:"omitnil,max=20"`
  }
  ```
- `@IsOptional` es un puntero con `omitnil`. Un campo sin `omitnil` tiene que venir y no ser
  `null`. Un struct anidado se valida solo; un slice necesita `dive` para sus elementos.
- En un `PATCH` donde `null` vacía una columna (Nest pasa el `null` a Prisma), el handler usa
  `decodeJSONWithNulls(r, &input)`, que además dice qué campos llegaron a `null`.
- Reglas con el texto de class-validator ya traducido: `required`, `min`, `max`, `gte`, `lte`
  (según sea texto, número o slice), `oneof`, `email`, `uuid`, `uuid4`, `latitude`,
  `longitude`, `ip` y `unique`. Propias: `iso8601`, `oneofci` (`oneof` sin espacios y en
  minúsculas, para un `@Transform(trim + toLowerCase)` antes de `@IsIn`) y `percentage` (si el
  campo `Type` del struct es `PERCENTAGE`, no pasa de 100). Una regla nueva se añade al mapa de
  `newValidator` y su texto a `defaultRuleMessage`.

**Respuestas**
- `respond.JSON(w, status, v)` escribe como `JSON.stringify`: sin escapar `<>&` y sin salto de
  línea final (`nodejson.Marshal`). Nest responde 201 a los `POST` salvo que diga otra cosa con
  `@HttpCode`: un `POST` que devuelve `void` responde `w.WriteHeader(http.StatusCreated)` sin
  cuerpo, y un `PATCH`/`PUT`, `w.WriteHeader(http.StatusOK)`.
- `writeSuccess(w)` es `commonMapper.getSuccessResponse()`: 200 con `{"success":true}`.
- Las fechas del JSON son `domain.Time` (`2026-09-27T10:00:00.000Z`, como `toISOString`), salvo
  las de turnos, intercambios, pedidos, líneas y ajustes, que Nest escribe con
  `Temporal.Instant.toString` y aquí son `domain.Instant` (`2026-09-27T10:00:00Z`, sin
  milisegundos si son cero). `domain.FormatISO` es `toISOString` para un texto suelto.
- `domain.ParseInstant` es `Temporal.Instant.from` (exige zona) y `domain.ParseDate` es
  `new Date()` para las formas ISO 8601.

**Errores**
- Los servicios devuelven `domain.NotFound(domain.CodeX)`, `domain.Forbidden(…)`, etc.
  (`domain/errors.go`), o un texto suelto de `domain.Message*` cuando Nest lo manda sin código.
  Los códigos están en `domain/error_codes.go` y un test comprueba que coinciden con
  `@coaster/common`: uno nuevo allí se añade aquí.
- El handler hace `writeError(w, err)`. Un `domain.Error` sale con el cuerpo de Nest y su
  estado; cualquier otro se registra con `slog` y sale como el 500 genérico.
- `domain.TooManyRequests` sale sin `error`, como el `HttpException` con un texto de Nest, y
  `domain.PaymentRequired` sale con `errorCode`, como el 402 de `SubscriptionActiveGuard`.
- Los middlewares escriben con `respond.Error`, que es lo que usa `writeError` por dentro.

## Servicios

- Un servicio por entidad y un método por comando o consulta de Nest. Los comandos devuelven
  solo `error`, como el `void` de Nest.
- Los servicios no miran permisos ni módulos: en HTTP los pone el guard y la IA los comprueba
  antes de llamar. Sí comprueban todo lo demás (que el pedido sea del local, que siga abierto,
  cantidades…), porque la IA no pasa por los DTOs.
- El dinero va en céntimos.
- Los inputs de los servicios están en `domain`, y la interfaz que usan los handlers, en
  `ports` con el nombre del servicio.

## Eventos

- Un evento es un struct de `domain/<entidad>_events.go` que acaba en `Event`
  (`OrderCreatedEvent`), con los campos de la clase de Nest. El servicio lo publica con
  `ports.EventPublisher` después de guardar.
- Quien escucha implementa `ports.EventSubscriber`: `EventHandlers()` devuelve una entrada
  `ports.On(func(ctx context.Context, event domain.XEvent) {…})` por evento. El tipo del
  parámetro es la suscripción: no hay nombres, listas ni `switch`. `main.go` pasa las tablas de
  todos los suscriptores a `bus.Subscribe`.
- `event.Bus` busca los manejadores por el tipo del evento y cada uno corre en su goroutine, con
  un contexto que no se cancela al acabar la petición. Al apagar, `main` espera a que terminen.
- El dueño del evento escribe también sus suscriptores (realtime, caché, auditoría), aunque en
  Nest estén en otro módulo.
- Lo que hace un admin de la plataforma se audita publicando `domain.AdminActionEvent`, que
  guarda `AdminAuditService`.

## Realtime

- `ports.Realtime` es el `RealtimeService` de Nest: `Publish(establishmentID, evento, payload)` y
  `Revoke(establishmentID, userID)`, que cierra los streams de esa persona en ese local en todas
  las instancias. Los nombres de evento están en `domain/realtime_events.go`.
- El payload tiene la forma del de Nest: un struct con tags `json` o un `map`.
- `GET /establishments/{establishmentId}/events` es SSE: `: open`, heartbeat cada 25 s, cierre a
  los 30 min y `Last-Event-ID`. Con Redis, el bus es el canal `coaster:realtime` de Nest y el
  replay de 2 min está en `realtime:<id>:replay`; sin Redis, solo llega a este proceso.

## Base de datos

- SQL a mano, un archivo por consulta en `repository/queries/<entidad>/`, con `//go:embed` en una
  variable. Las transacciones empiezan y terminan dentro de un método del repositorio.
- El esquema está en `apps/database`: las migraciones de goose, `schema.sql` y el programa que las
  aplica. Cómo se escribe una migración, y por qué no la aplica la API al arrancar, está en
  [database](../database.md). No se escriben más migraciones de Prisma.
- Las tablas y columnas son las de Prisma, con comillas: `"User"`, `"createdAt"`.
- Prisma pone `@default(uuid())` y `@updatedAt` desde el cliente: Go genera el `id` con
  `uuid.NewV4()` y cada `UPDATE` de una tabla con `@updatedAt` escribe `"updatedAt"`.
- Los arrays de enums se escriben con `$n::text[]::"Allergen"[]` y se leen con
  `COALESCE(columna, '{}')::text[]`.
- En los tests de `repository/`, `testPool` tiene aplicadas las migraciones de `apps/database` y
  `resetDB(t)` vacía las tablas, salvo `goose_db_version`.

## Caché

- `ports.Cache` (`adapter/cache`) guarda como Nest (`{"v": ...}`, 8 h) en las mismas claves, así
  que Nest y Go comparten Redis. Sin `REDIS_URL` no cachea nada.
- Las claves están en `service/cache.go`. Quien cambia el rol de un usuario, un miembro, los
  módulos o la suscripción de un local olvida su clave después de guardar, y antes de avisar por
  realtime.
- `service.SecurityService` responde las comprobaciones del guard (rol, membresía, módulos y
  suscripción) con esa caché.

## Emails

- Van por `ports.Mailer`: `email.ResendMailer` con `RESEND_API_KEY` y, sin ella, `email.LogMailer`,
  que los escribe en el log. Con `TEST_MAILBOX_URL` (solo tests), `email.TestMailbox` los manda
  al arnés de los e2e.
- Los textos están en `adapter/email/templates.go` y el marco en `templates/layout.html`.

## Cobros (Stripe)

- Stripe está detrás de `ports.PaymentGateway` (`adapter/payment`), que devuelve tipos de
  `domain/stripe.go` y traduce los fallos a los `domain.Error` de Nest. El servicio nunca importa
  stripe-go.
- `SubscriptionService` es todo `establishment-subscription`: rutas, webhook
  (`HandleWebhook(ctx, cuerpo, firma)` verifica y enruta), asientos y los suscriptores de sus
  eventos. Quien conceda o revoque un plan a mano publica `SubscriptionOverriddenEvent`.
- Los asientos se sincronizan al invitar o quitar un miembro; el error se registra y no para
  nada, como en Nest.

## Pedidos, cierres y estadísticas

- `OrderRepository` tiene las transacciones de pedidos. Lo que solo vale con el pedido abierto se
  escribe con `execWhileOpen` (`WHERE status = 'OPEN'`): sin fila, 400 `ORDER_NOT_OPEN`.
- Los totales salen de `domain.CalculatePricing` (`OrderPricingEngine.calculate`), y
  `OrderRow.Pricing()` los calcula desde una fila. Redondean como `Math.round`.
- Al cobrar, `amountPaidCash` y `amountPaidCard` guardan lo cobrado **con la propina**, que
  además está en `tipAmount`: lo facturado es `amountPaidCash + amountPaidCard - tipAmount`.
- El stock lo mueve `OrderStock` desde los eventos de pedidos, con `ProductService.AdjustStock`.
  Quien reaccione a un pedido cobrado se suscribe a `OrderClosedEvent`.
- Un pedido con `cashCloseId` no se puede borrar (`ORDER_IN_CASH_CLOSE`).
- `productName` es el nombre actual del producto y `tableName` el que guarda el pedido o, si no
  tiene, el de su mesa.
- Las estadísticas cuentan cada pedido por `createdAt` (cuando se abrió), como Nest, y agrupan en
  `Europe/Madrid` (`domain.InEstablishmentZone`).

## Turnos y fichajes

- La jornada se cuenta en `Europe/Madrid` (`domain.WorkdayDateOf`,
  `domain.StartOfEstablishmentDay`). `domain/workday.go` importa `time/tzdata`, así que la zona
  carga aunque la imagen no tenga ficheros de zonas.
- Los fichajes son una cadena de hashes compatible con Nest, con el mismo advisory lock.

## Impresoras

- Las rutas del puente (`/printer`) no llevan usuario: se autentican con `X-Device-Key`,
  comparada en tiempo constante.
- `jobs/next` espera hasta 25 s (long-poll) y se suelta al apagar (`PrinterService.StopWaiting`).
  Los trabajos reclamados sin resultado vuelven a la cola a los 2 min y fallan al tercer intento.
- El token de `connection` es HS256 con `{establishmentId}` y dura 8 días; un test lo comprueba
  con la verificación de `apps/printer-service`.

## IA

**Dónde está cada cosa**
- `domain/ai.go`: mensajes, respuestas, uso, `AIToolResult` y los formateadores de la instantánea.
- `ports/ai.go`: `AIModel`, `AITool` y `AIUsageRepository`.
- `adapter/ai`: `Gateway` habla con `https://ai-gateway.vercel.sh/v1` con openai-go y hace lo del
  AI SDK: el bucle de pasos, comprobar la entrada de cada herramienta contra su esquema como zod
  (`tool_input.go`) y el streaming. El servicio no importa openai-go.
- `service/ai_service.go`: `Execute` (`ExecuteAiCommand`), `Usage`, el modelo, sus respaldos y el
  prompt de sistema. La cuota se reserva antes de llamar al modelo (`ReserveMessage`) y se
  devuelve si no responde (`ReleaseMessage`).
- `service/ai_tools.go`: el contexto de un turno (`aiToolContext`), el runner de Nest
  (`tc.execute` para comandos, `aiQuery` para consultas, `aiConfirmation` para las destructivas)
  y `newAITool`. Las herramientas van por área en `ai_tools_<área>.go`.

**Añadir o cambiar una herramienta**
- La entrada es un struct: sin `omitempty` es obligatoria, con puntero y `omitempty` opcional;
  `jsonschema` lleva las reglas de zod (`minimum`, `maximum`, `enum`, `minItems`) y
  `jsonschema_description` el `.describe()`. `z.number().int()` es `int` con
  `minimum=-9007199254740991,maximum=9007199254740991`, como lo escribe zod.
- `newAITool(nombre, descripción, func(ctx, input T) domain.AIToolResult)`. Lo que Nest comprueba
  antes del runner va con `aiFailed`; la llamada al servicio, con `tc.execute(permiso,
  confirmación, func() error {...})` o `aiQuery(tc, permiso, consulta, proyección)`. El dinero va
  en euros con `toEuros` y vuelve con `toCents`.
- `service/testdata/nest_ai_tools.json` (esquemas) y `nest_ai_answers.json` (respuestas y
  prompts) se sacaron ejecutando `apps/api/src/ai` con un spec de vitest temporal. Si Nest cambia
  una herramienta, se vuelven a sacar igual.
- Las mesas y productos de los pedidos se nombran con la instantánea del turno, como en Nest.

**Probar**
- El bucle, en `adapter/ai/gateway_test.go` con un `httptest.Server` compatible con OpenAI.
- Las herramientas y el prompt, en `service/ai_*_test.go` con los servicios reales y sus fakes.
- **Los modelos de respaldo, a mano y con la clave de verdad**: con `AI_GATEWAY_API_KEY`, mandar
  un mensaje y ver en el panel del AI Gateway que la petición lleva los modelos de respaldo (o
  forzar un modelo principal que no exista). Si el gateway no los lee en
  `providerOptions.gateway.models`, probar `models` en la raíz del cuerpo (`SetExtraFields` en
  `Gateway.Generate`).

## Tests

- Tests por tabla con `testing`; las comprobaciones, con `if` y `t.Errorf`.
- Los fakes que usan varios tests de un paquete están en su `fakes_test.go`: en `service`,
  `eventRecorder`, `realtimeRecorder`, `fakeCache`, `fakeSecurity`… y `deliver(handlers, event)`,
  que entrega un evento a una tabla de manejadores sin goroutines; en `httpapi`, `fakeAccess`
  (rol de plataforma, rol en el local y módulos), `discardEvents`, `noCache` y `testGuard(access)`.
  Un fake nuevo de un puerto que ya tiene uno amplía ese en lugar de copiarlo.
- Para un puntero a un valor, `new("texto")`.

**e2e contra Go** (`apps/api/test/utils/go-app.ts`)
- Con `E2E_TARGET=go`, `setup.e2e.ts` compila `./cmd/api` una vez en
  `os.tmpdir()/coaster-api-e2e` y cada archivo e2e arranca su propio proceso Go en un puerto
  libre, con el entorno del test (`REDIS_URL` vacío, `PUBLIC_DIR=apps/api/public`,
  `TEST_MAILBOX_URL`, `GOOGLE_CERTS_URL`…). Con varios agentes en la misma máquina, cada uno
  lanza los e2e con su propio `TMPDIR`.
- `testSetup.app.getHttpServer()` es un proxy que pasa `/api/...` a `/api/v1/...`, cambia
  `x-e2e-user-id` (o `mockUser`) por un JWT de verdad y deja pasar los streams SSE. Prisma sigue
  preparando los datos y `clearDatabase` vacía las tablas.
- El usuario del test tiene que existir en la base de datos y estar activo, y su `role` es el de
  la base de datos.
- `TEST_MAILBOX_URL` (Go hace `POST` de `{"kind","to","token"}` en lugar de mandar el email) y
  `GOOGLE_CERTS_URL` (claves de Google) son solo para tests: `config.Load` falla si vienen en
  producción.
- Un test que no puede ir contra Go se salta solo en modo Go, con `it.skipIf(isGoTarget)` y un
  comentario con el motivo. Hoy se saltan los de `realtime` que llaman a `RealtimeService` dentro
  del proceso (Go los cubre en sus tests) y dos de `admin` que dependen de `MockAuthGuard`.
