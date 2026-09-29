# coaster-api

La API de Coaster en Go, en `apps/coaster-api`. Sustituye a `apps/api` (NestJS + Prisma): hasta el
cambio (P5 en la [migración](migracion.md)), `apps/api` sigue en producción y es la referencia de
comportamiento. El contrato HTTP (rutas, JSON, errores, códigos de `@coaster/common` y cookies) es
el mismo.

## Arrancar

- **Con Docker**: `docker compose up db redis coaster-api`, desde la raíz del repo. Go escucha en
  `http://localhost:3001` y Nest sigue en el 3000, contra la misma base de datos. El servicio
  carga `apps/api/.env` (las variables son las mismas que las de Nest) y fija en `compose.yaml`
  las que son de Go (`PORT`, `PUBLIC_DIR`, `PUBLIC_URL`). Las migraciones las aplica el servicio
  `api` de Nest; con una base vacía y sin él: `docker compose run --rm api npx prisma migrate deploy`.
- **En el anfitrión**: `apps/coaster-api/scripts/dev.sh`. La primera vez crea
  `apps/coaster-api/.env` a partir de `apps/api/.env` (`scripts/env-local.sh`, que se puede volver
  a lanzar si cambia) y arranca `go run ./cmd/api` en el 3001. Necesita `db` y `redis` de compose.
- **La web contra Go**: `API_URL=http://localhost:3001 docker compose up web` (o
  `API_URL=http://localhost:3001 npm run dev:web`).

Qué variables lee Go está en `apps/coaster-api/.env_example`; las obligatorias son `DATABASE_URL`,
`AUTH_JWT_SECRET` y `PRINTER_JWT_SECRET`. Solo `internal/config` lee el entorno.

## Probar

- `go vet ./...` y `go test ./...`, desde `apps/coaster-api`. Los tests de `repository/` levantan
  `postgres:18-alpine` con testcontainers, así que necesitan Docker.
- Los e2e de `apps/api` contra Go: `apps/coaster-api/scripts/e2e-go.sh`, desde la raíz del repo.
  Necesitan Docker, Node 26 y el Go de `go.mod` (`export GOTOOLCHAIN=go1.27.0`). Los argumentos
  van a vitest: un directorio (`test/orders`) o un nombre de test (`-t 'nombre'`).
- En el CI, el job `coaster-api` pasa `gofmt`, `go vet` y `go test`, y `coaster-api-e2e` los e2e.

## Documentación

- [Estructura](estructura.md): las carpetas y para qué sirve cada una (arquitectura hexagonal).
- [Convenciones](convenciones.md): cómo se hace cada cosa (rutas, validación, eventos, SQL, tests…).
- [Migración](migracion.md): objetivos, decisiones, estado, siguiente paso y diferencias con Nest.
- [Librerías](librerias.md): las librerías aprobadas.
- `apps/coaster-api/CLAUDE.md`: las reglas para los agentes. Se queda junto al código porque es
  donde Claude Code lo busca.
