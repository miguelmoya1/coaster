# Librerías para la API en Go

Equivalencias entre lo que usa `apps/api` (NestJS) y lo que usaría `apps/api-go`.
Están **pendientes de revisar**. Antes de añadir cualquiera, comprobar la última versión,
si sigue mantenida y su licencia.

Estado: ⬜ sin revisar · ✅ aprobada · ❌ descartada

## Base

| Ahora | En Go | Notas | Estado |
|---|---|---|---|
| NestJS + Fastify | `net/http` (librería estándar) | Desde Go 1.22 el router estándar ya acepta métodos y parámetros (`GET /orders/{id}`). No hace falta framework. | ⬜ |
| `@nestjs/config` | `os.Getenv` + lectura de `.env` propia | Como en el proyecto de prueba. | ⬜ |
| Logger de Nest | `log/slog` (estándar) | Logs en JSON, que Cloud Run entiende directamente. | ⬜ |
| `Temporal` | `time` (estándar) | | ⬜ |
| `class-validator` | `github.com/go-playground/validator/v10` | Validación con tags en los structs. | ⬜ |
| `@nestjs/swagger` | Opcional: `github.com/swaggo/swag` | Decidir si hace falta. Solo se usa fuera de producción. | ⬜ |

## Base de datos

| Ahora | En Go | Notas | Estado |
|---|---|---|---|
| Prisma Client | `github.com/jackc/pgx/v5` + `pgxpool` | SQL escrito a mano en archivos `.sql` con `go:embed` (ver `ESTRUCTURA.md`). | ⬜ |
| Prisma Migrate | `github.com/pressly/goose/v3` | Partir del esquema actual como migración base. Las 48 migraciones de Prisma ya son SQL. | ⬜ |
| — | ~~sqlc~~ | Descartado por ahora: se prefiere escribir el SQL y el mapeo a mano. Se puede añadir más adelante sin cambiar los `.sql`. | ❌ |

## Seguridad y autenticación

| Ahora | En Go | Notas | Estado |
|---|---|---|---|
| `jose` (JWT propio) | `github.com/golang-jwt/jwt/v5` | Mismos claims (`sub`, `sid`) y mismo `AUTH_JWT_SECRET`, para que las sesiones sigan valiendo al cambiar. | ⬜ |
| Verificación de Google | `google.golang.org/api/idtoken` | Valida firma, `aud` y emisor con las claves públicas de Google y las cachea. | ⬜ |
| `@node-rs/argon2` | `github.com/alexedwards/argon2id` | **Crítico**: tiene que verificar los hashes que ya hay en la base de datos (formato `$argon2id$v=19$…`). Probarlo con hashes reales antes de nada. | ⬜ |
| `@fastify/helmet` | Middleware propio | Son unas pocas cabeceras. | ⬜ |
| CORS de Nest | `github.com/rs/cors` o middleware propio | Mantener la lista cerrada en producción. | ⬜ |
| `@nestjs/throttler` | `github.com/go-redis/redis_rate/v10` | Límite compartido entre instancias, con Redis. | ⬜ |
| `@fastify/cookie` | `net/http` (estándar) | | ⬜ |

## Servicios externos

| Ahora | En Go | Notas | Estado |
|---|---|---|---|
| `stripe` | `github.com/stripe/stripe-go` | Oficial. Incluye la verificación de firma de los webhooks. | ⬜ |
| `resend` | `github.com/resend/resend-go` | Oficial. | ⬜ |
| `@google-cloud/storage` | `cloud.google.com/go/storage` | Oficial. URLs firmadas para subir imágenes. | ⬜ |
| `ioredis` | `github.com/redis/go-redis/v9` | Caché, pub/sub del realtime y buffer de replay (sorted sets). | ⬜ |
| Plantillas de email (strings en TS) | `html/template` (estándar) + `go:embed` | Escapa el HTML automáticamente. | ⬜ |
| `@fastify/compress` | `github.com/klauspost/compress/gzhttp` | Opcional: Cloud Run no comprime por su cuenta. | ⬜ |
| `@fastify/static` | `http.FileServer` (estándar) | Para `/public/` (actualizaciones del puente de impresión). | ⬜ |

## Inteligencia artificial

| Ahora | En Go | Notas | Estado |
|---|---|---|---|
| `ai` (AI SDK de Vercel) | `github.com/openai/openai-go` | El AI Gateway de Vercel acepta el protocolo de OpenAI, así que basta con cambiar la URL base. El bucle de herramientas (hasta 8 pasos) se escribe a mano. | ⬜ |
| `zod` (esquemas de herramientas) | `github.com/invopop/jsonschema` | Genera el JSON Schema de cada herramienta a partir de un struct. | ⬜ |
| Modelos de respaldo del gateway | — | **Por comprobar**: cómo pasar la lista de modelos de respaldo sin usar el SDK de Vercel. | ⬜ |

## Tiempo real (SSE)

| Ahora | En Go | Notas | Estado |
|---|---|---|---|
| `reply.raw` + registro propio | `net/http` + `http.Flusher` (estándar) | Una goroutine por conexión. Heartbeat con `time.Ticker`. | ⬜ |

## Tests

| Ahora | En Go | Notas | Estado |
|---|---|---|---|
| Vitest (unitarios) | `testing` (estándar) | Tests por tabla y fakes de las interfaces de `ports`. | ⬜ |
| testcontainers (Node) | `github.com/testcontainers/testcontainers-go/modules/postgres` | Para los tests de repositorios con una base de datos real. | ⬜ |
| e2e con supertest | **Se reutilizan los de `apps/api`** | `supertest` acepta una URL, así que se pueden lanzar contra el servidor Go. Ver `MIGRACION.md`. | ⬜ |
