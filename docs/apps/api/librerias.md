# Librerías para la API en Go

Equivalencias entre lo que usaba la API de NestJS y lo que usa `apps/api`.
Revisadas el 27-sep-2026. Solo queda ⬜ lo de los modelos de respaldo de la IA (P3).
Antes de añadir cualquiera, comprobar la última versión, si sigue mantenida y su licencia.

Estado: ⬜ sin revisar · ✅ aprobada · ❌ descartada

## Base

| Ahora | En Go | Notas | Estado |
|---|---|---|---|
| NestJS + Fastify | `net/http` (librería estándar) | Desde Go 1.22 el router estándar ya acepta métodos y parámetros (`GET /orders/{id}`). No hace falta framework. | ✅ |
| `@nestjs/config` | `os.Getenv` | Sin lector de `.env` propio. En local, `apps/api/.env` lo cargan el servicio de `compose.yaml` (con `env_file`) y `scripts/dev.sh`. | ✅ |
| Logger de Nest | `log/slog` (estándar) | Logs en JSON, que Cloud Run entiende directamente. | ✅ |
| `Temporal` | `time` (estándar) | | ✅ |
| `class-validator` | `github.com/go-playground/validator/v10` | Validación con tags en los structs. Hay que traducir cada error al texto de class-validator (`"email must be an email"`) y rechazar los campos desconocidos (`"property x should not exist"`), porque `apps/web` muestra `message[0]`. | ✅ |
| `@nestjs/swagger` | ~~`github.com/swaggo/swag`~~ | Funciona con anotaciones en comentarios y solo se usa fuera de producción. | ❌ |

## Base de datos

| Ahora | En Go | Notas | Estado |
|---|---|---|---|
| Prisma Client | `github.com/jackc/pgx/v5` + `pgxpool` | SQL escrito a mano en archivos `.sql` con `go:embed` (ver [estructura](estructura.md)). | ✅ |
| Prisma Migrate | `github.com/pressly/goose/v3` | Lleva el esquema desde el 29 de septiembre de 2026, en `apps/database` (ver [database](../database.md)). Aquí solo se usa en los tests de `repository/`, para montar la base. | ✅ |
| — | ~~sqlc~~ | Descartado por ahora: se prefiere escribir el SQL y el mapeo a mano. Se puede añadir más adelante sin cambiar los `.sql`. | ❌ |

## Seguridad y autenticación

| Ahora | En Go | Notas | Estado |
|---|---|---|---|
| `jose` (JWT propio) | `github.com/golang-jwt/jwt/v5` | Mismos claims (`sub`, `sid`) y mismo `AUTH_JWT_SECRET`, para que las sesiones sigan valiendo al cambiar. | ✅ |
| Verificación de Google | `google.golang.org/api/idtoken` | Valida firma, `aud` y emisor con las claves públicas de Google y las cachea. | ✅ |
| `@node-rs/argon2` | `golang.org/x/crypto/argon2` | Lo mantiene el equipo de Go. Leer el formato `$argon2id$v=19$m=19456,t=2,p=1$…` son unas 30 líneas propias. **Crítico**: en P1, un test que verifique hashes generados por `@node-rs/argon2`; antes de P5, uno real de la base de datos. | ✅ |
| — | ~~`github.com/alexedwards/argon2id`~~ | Es solo un envoltorio de `x/crypto/argon2` y no publica versión desde 2023. | ❌ |
| `@fastify/helmet` | Middleware propio | Copiar exactamente las cabeceras que envía hoy la API. | ✅ |
| CORS de Nest | Middleware propio | La configuración es fija: lista de orígenes, 6 métodos, 3 cabeceras y `credentials`. Mantener la lista cerrada en producción. | ✅ |
| — | ~~`github.com/rs/cors`~~ | Para una configuración fija es más fácil comprobar la paridad con código propio. | ❌ |
| `@nestjs/throttler` | go-redis + script Lua propio | Copia de `throttler-cache.storage.ts` de Nest: el mismo script Lua con `redis.NewScript` y, sin Redis, un contador en memoria. 300 peticiones por minuto. | ✅ |
| — | ~~`github.com/go-redis/redis_rate/v10`~~ | No publica versión desde 2023 y Nest ya usa un script propio. | ❌ |
| `@fastify/cookie` | `net/http` (estándar) | | ✅ |

## Servicios externos

| Ahora | En Go | Notas | Estado |
|---|---|---|---|
| `stripe` | `github.com/stripe/stripe-go/v86` | Oficial. Incluye la verificación de firma de los webhooks. | ✅ |
| `resend` | `github.com/resend/resend-go/v3` | Oficial. | ✅ |
| `@google-cloud/storage` | `cloud.google.com/go/storage` | Oficial. URLs firmadas para subir imágenes. | ✅ |
| `ioredis` | `github.com/redis/go-redis/v9` | Caché, pub/sub del realtime y buffer de replay (sorted sets). | ✅ |
| Plantillas de email (strings en TS) | `html/template` (estándar) + `go:embed` | Escapa el HTML automáticamente. | ✅ |
| `@fastify/compress` | `github.com/klauspost/compress/gzhttp` | Nest comprime con gzip y deflate, y Cloud Run no comprime por su cuenta. Sin comprimir `text/event-stream`. | ✅ |
| `@fastify/static` | `http.FileServer` (estándar) | Para `/public/` (actualizaciones del puente de impresión). Sin listado de directorios: Nest responde 404. | ✅ |

## Inteligencia artificial

| Ahora | En Go | Notas | Estado |
|---|---|---|---|
| `ai` (AI SDK de Vercel) | `github.com/openai/openai-go/v3` | El AI Gateway de Vercel acepta el protocolo de OpenAI, así que basta con cambiar la URL base. El bucle de herramientas (hasta 8 pasos) se escribe a mano. | ✅ |
| `zod` (esquemas de herramientas) | `github.com/invopop/jsonschema` | Genera el JSON Schema de cada herramienta a partir de un struct. Son 40 herramientas, así que compensa. | ✅ |
| Modelos de respaldo del gateway | — (un campo más en el cuerpo con `SetExtraFields` de openai-go) | Hecho en P3 como `providerOptions.gateway.models` en el cuerpo de Chat Completions, que es lo que documenta el AI Gateway para su API compatible con OpenAI. **Falta que Miguel lo confirme con la clave de verdad** (cómo, en «IA» de [convenciones](convenciones.md)). | ⬜ |

## Tiempo real (SSE)

| Ahora | En Go | Notas | Estado |
|---|---|---|---|
| `reply.raw` + registro propio | `net/http` + `http.Flusher` (estándar) | Una goroutine por conexión. Heartbeat con `time.Ticker`. | ✅ |

## Tests

| Ahora | En Go | Notas | Estado |
|---|---|---|---|
| Vitest (unitarios) | `testing` (estándar) | Tests por tabla y fakes de las interfaces de `ports`. Las comprobaciones se escriben a mano con `if` y `t.Errorf`. | ✅ |
| — | ~~`github.com/stretchr/testify`~~ | Con `testing` basta y es lo más idiomático. | ❌ |
| testcontainers (Node) | `github.com/testcontainers/testcontainers-go/modules/postgres` | Para los tests de repositorios con una base de datos real. | ✅ |
| e2e con supertest | `net/http` y testcontainers | En `apps/api/e2e`: el binario de verdad contra un Postgres de verdad. Ver «Tests» en [convenciones](convenciones.md). | ✅ |
