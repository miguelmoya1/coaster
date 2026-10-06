# API

La API de Coaster en Go, en `apps/api`. Sustituye a la de NestJS, que ya no está en el
repositorio: beta corre Go y producción sigue con Nest hasta el merge a `main` (ver la
[migración](migracion.md)). El contrato HTTP (rutas, JSON, errores, códigos de error y cookies) es
el de `apps/web`.

## Arrancar

- **Con Docker**: `docker compose up`, desde la raíz del repo. Go escucha en
  `http://localhost:3000`, y la web y el reenvío de webhooks de `stripe` van contra él. El servicio carga
  `apps/api/.env` (se crea copiando `.env_example`) y fija en `compose.yaml` lo que cambia
  dentro de Docker (`DATABASE_URL`, `REDIS_URL`, `PORT`, `PUBLIC_DIR`, `PUBLIC_URL`). Las migraciones las aplica el servicio `migrate`
  ([database](../database.md)) antes de que arranque la API. La imagen no se
  recarga sola: después de cambiar código, `docker compose up -d --build api`.
- **En el anfitrión**: `apps/api/scripts/dev.sh` carga el mismo
  `apps/api/.env` y arranca `go run ./cmd/api` en el 3000. Necesita `db`, `redis` y
  `migrate` de compose, y el puerto libre: `docker compose stop api`.

Qué variables lee Go está en `apps/api/.env_example`; las obligatorias son `DATABASE_URL`,
`AUTH_JWT_SECRET` y `PRINTER_JWT_SECRET`. Solo `internal/config` lee el entorno.

## Probar

- `go vet ./...` y `go test -count=1 ./...`, desde `apps/api`. Los tests de `repository/`
  levantan `postgres:18-alpine` con testcontainers, así que necesitan Docker.
- Los e2e están en `e2e/` y entran en `go test ./...`: compilan la API con `go build` en otro
  proceso y la lanzan contra un Postgres de testcontainers. La caché de `go test` solo ve el
  paquete `e2e` y lo que importa, no la API que compila, así que sin `-count=1` da por pasados
  unos e2e que no ha vuelto a correr después de cambiar un handler o una consulta. Uno suelto:
  `go test -count=1 ./e2e/ -run 'TestOrders/checks'`.
- En el CI, el job `api` pasa `gofmt`, `go vet` y `go test -count=1` (los e2e incluidos), y el
  despliegue lo espera. El `-count=1` también hace falta ahí: el CI restaura la caché de Go
  entre ejecuciones.

## Documentación

- [Estructura](estructura.md): las carpetas y para qué sirve cada una (arquitectura hexagonal).
- [Convenciones](convenciones.md): cómo se hace cada cosa (rutas, validación, eventos, SQL, tests…).
- [Migración](migracion.md): objetivos, decisiones, estado, siguiente paso y diferencias con lo
  que corre en producción.
- [Librerías](librerias.md): las librerías aprobadas.
- `apps/api/CLAUDE.md`: las reglas para los agentes. Se queda junto al código porque es
  donde Claude Code lo busca.
