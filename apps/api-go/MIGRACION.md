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
- **SQL a mano, un archivo `.sql` por consulta**, incrustado con `go:embed` (ver
  `ESTRUCTURA.md`). Sin ORM y sin sqlc por ahora.
- **Consultas simples.** La API actual casi no anida relaciones: son includes de un solo
  nivel, como `preferences`, `adjustments` o `items` con `product`. Cuando haga falta, se
  hacen dos consultas y se juntan en Go.
- **El código lo escribe la IA** y se revisa fase a fase.

## Cómo encaja la API actual

```
internal/
├── core/domain/        order.go, product.go, … (~20 archivos, uno por módulo de Nest)
├── core/ports/         order.go, product.go, … + events.go
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
| P0 Base | `go.mod`, config, pool de pgx, migración base con goose, router, formato de respuestas y errores **idéntico a Nest**, validación, middlewares de logging/recovery/CORS/cabeceras, `EventPublisher`, Dockerfile | — |
| P1 Auth y permisos | JWT, sesiones con rotación de refresh tokens, Google, argon2, tokens de email, middlewares de auth/permisos/módulos/suscripción/admin, rate limit | P0 |
| P2a Catálogo | Categorías, productos, catálogo inicial, carta pública, media (GCS) | P1 |
| P2b Local y personas | Locales, miembros e invitaciones, usuarios, admin | P1 |
| P2c Turnos y fichajes | Turnos, intercambios, fichajes (advisory lock, triggers) | P1 |
| P2d Pedidos | Pedidos (`FOR UPDATE`), mesas, cierres de caja, estadísticas, impresoras | P1 |
| P2e Cobros | Stripe, suscripciones, webhooks, emails (Resend) | P1 |
| P2f Realtime | SSE, bus en Redis, replay, suscriptores de eventos | P1 |
| P3 IA | AI Gateway, bucle de herramientas, cuota | P2a, P2d, P2c |
| P4 Arnés e2e | Adaptar los e2e de `apps/api` para lanzarlos contra Go | P0 |
| P5 Salida | Paridad completa, beta en paralelo, cambio en producción | Todo |

Los seis paquetes P2 pueden ir a la vez. El volumen esperado son ~15–20k líneas de Go y
~12–18k de tests.

### Lo que comprime

- Todo P0, P2 y P4: es código mecánico que sigue un patrón y se comprueba en local.
- Los tests de cada paquete.

### Lo que no comprime

- **Tu revisión** de cada paquete. Es el objetivo de aprender, así que no conviene saltársela.
- **Revisar `LIBRERIAS.md`** antes de P0.
- **Probar argon2 con hashes reales** de la base de datos antes de cerrar P1.
- **Confirmar los modelos de respaldo del AI Gateway** sin el SDK de Vercel (P3).
- **Stripe en modo test**: dar de alta el endpoint del webhook de Go en el panel de Stripe (P2e).
- **Infraestructura**: servicio nuevo en Cloud Run, job de migraciones y CI.
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
| Revisión de `LIBRERIAS.md` | ⬜ Pendiente | La hace Miguel |
| P0 Base | ⬜ Pendiente | |
| P1 Auth y permisos | ⬜ Pendiente | |
| P2a Catálogo | ⬜ Pendiente | |
| P2b Local y personas | ⬜ Pendiente | |
| P2c Turnos y fichajes | ⬜ Pendiente | |
| P2d Pedidos | ⬜ Pendiente | |
| P2e Cobros | ⬜ Pendiente | |
| P2f Realtime | ⬜ Pendiente | |
| P3 IA | ⬜ Pendiente | |
| P4 Arnés e2e | ⬜ Pendiente | |
| P5 Salida | ⬜ Pendiente | |

## Siguiente paso

1. Miguel revisa `LIBRERIAS.md` y marca cada librería como ✅ o ❌.
2. Empezar **P0 Base**:
   - `go mod init` y la versión de Go.
   - `internal/config` con las variables de entorno de `apps/api/README.md`.
   - Pool de pgx en `internal/adapter/repository/client.go`.
   - Migración base con goose en `scripts/`, sacada del esquema actual.
   - Router, `response.go` y middlewares, copiando **exactamente** el formato de respuestas
     y errores de Nest.
   - `EventPublisher` en `ports/` con su implementación en memoria.
   - Una ruta de salud (Nest no tiene ninguna, así que es nueva) y el Dockerfile.

## Comprobar que Go se comporta igual que Nest

Los e2e de `apps/api/test` usan `supertest`, que acepta una URL en lugar de la app de Nest.
Para lanzarlos contra el servidor Go:

1. Cambiar `testSetup.app.getHttpServer()` por la URL del servidor Go.
2. Cambiar el `mockUser`, que hoy se salta el `AuthGuard`, por un JWT firmado de verdad con
   el secreto de test.
3. Prisma puede seguir preparando los datos de prueba, porque la base de datos es la misma.

Así los 32 archivos e2e sirven para comprobar la paridad sin reescribirlos.

## Riesgos

- **El contrato de la API tiene que ser idéntico**: rutas (`/api/v1/...`), forma del JSON,
  cuerpo de los errores de Nest (`statusCode`, `message`, `error`), los `ErrorCodes` de
  `@coaster/common`, los errores de validación y las cookies. Si algo cambia, se rompe `apps/web`.
- **Contraseñas**: argon2 en Go tiene que verificar los hashes existentes.
- **Tokens**: mismos claims y mismo secreto, para que nadie tenga que volver a iniciar
  sesión al hacer el cambio.
- **Migraciones**: goose empieza desde el esquema actual. Los triggers de `TimeEntry` y el
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
