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
| P3 IA | AI Gateway, bucle de herramientas, cuota | P2a, P2d, P2c |
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
| P1 Auth y permisos | ⬜ Pendiente | |
| P2a Catálogo | ⬜ Pendiente | |
| P2b Local y personas | ⬜ Pendiente | |
| P2c Turnos y fichajes | ⬜ Pendiente | |
| P2d Pedidos | ⬜ Pendiente | |
| P2e Cobros | ⬜ Pendiente | |
| P2f Realtime | ⬜ Pendiente | |
| P3 IA | ⬜ Pendiente | |
| P4 Arnés e2e | ✅ Hecho | `E2E_TARGET=go` lanza los e2e de `apps/api` contra Go: el `globalSetup` compila el binario, cada archivo arranca su servidor detrás de un proxy que pone `/api/v1` y un JWT de verdad, buzón de test y claves de Google por HTTP, `e2e-paquetes.txt`, `scripts/e2e-go.sh` y job de CI `api-go-e2e`. Lo que falta en Go está en «Convenciones de P4» |
| P5 Salida | ⬜ Pendiente | |

## Siguiente paso

Ola 2: **P1 Auth y permisos** y **P4 Arnés e2e**, en paralelo. Antes de empezar, leer
«Convenciones de P0», justo debajo.

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

## Ejecución con agentes

Los paquetes los ejecuta un agente orquestador que lanza subagentes. Se hace en olas:

| Ola | Paquetes | Cómo |
|---|---|---|
| 1 | P0 | Un solo agente: es la base y tiene que ser coherente. |
| 2 | P1 y P4 | Dos subagentes en paralelo. |
| 3 | P2a, P2b, P2c, P2d, P2e y P2f | Seis subagentes en paralelo. |
| 4 | P3 | Un subagente. |

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
- Si no hay Docker donde corre el agente, los tests con base de datos se comprueban en el job
  de CI de GitHub Actions.
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
