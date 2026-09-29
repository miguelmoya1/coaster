# database

`apps/database` es el esquema de la base de datos de Coaster: las migraciones, el programa que las
aplica y el esquema entero en un fichero. Es una aplicación aparte porque su despliegue también lo
es (un job de Cloud Run), y porque el esquema no depende de qué API lo use: hoy lo leen la API en Go
y, en producción hasta el merge a `main`, Nest.

## Qué hay

| Ruta          | Qué es                                                                                                                        |
| ------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| `migrations/` | Las migraciones de goose, una por archivo, con la fecha como versión. Las 47 primeras son las de Prisma, copiadas tal cual    |
| `schema.sql`  | El esquema entero, generado desde las migraciones. Es para leerlo de un vistazo, como lo era `schema.prisma`; nunca se aplica |
| `migrate.go`  | `Migrate`: aplica las migraciones pendientes y, la primera vez sobre una base que migró Prisma, adopta su historial           |
| `cmd/migrate` | El programa que corre el job de Cloud Run y el servicio `migrate` de compose. Solo lee `DATABASE_URL`                         |
| `queries/`    | Las consultas de `Migrate`, un archivo por consulta como en `apps/api`                                                |
| `Dockerfile`  | La imagen del job: solo lleva `migrate`                                                                                       |

## Añadir una migración

1. Un archivo nuevo, `migrations/<AAAAMMDDhhmmss>_<nombre>.sql`, que empiece por `-- +goose Up`. Si
   tiene funciones con `$$`, o para mandarla entera de una vez, va entre
   `-- +goose StatementBegin` y `-- +goose StatementEnd`. No lleva `Down`: una migración se corrige
   con otra, y las que ya están no se editan, porque ya se han aplicado en beta o en producción.
2. Mientras producción siga con Nest, no puede romperlo: se añaden tablas o columnas que admiten
   `null` o tienen valor por defecto, y no se borra ni se renombra nada.
3. `go test -run TestSchemaIsUpToDate -update` rehace `schema.sql`.
4. `go test ./...` aquí y en `apps/api`, cuyos tests de `repository/` y e2e montan su base
   con estas migraciones.

## Aplicarlas

- **En local**, `docker compose up` las aplica antes de arrancar las APIs. A mano:
  `docker compose run --rm migrate`, o en el anfitrión
  `DATABASE_URL=postgres://admin:admin@localhost:5432/coaster go run ./cmd/migrate`.
- **Al desplegar**, el CI construye la imagen de esta aplicación y corre el job de Cloud Run
  (`api-migrate-beta` o `api-migrate`) antes de la revisión nueva de la API. El despliegue espera
  al job `database` del CI, así que una migración no llega a beta ni a producción sin que pasen
  sus tests.

Mientras migra, `migrate` bloquea con una fila de la tabla `goose_lock`, que renueva cada 5 s y se
suelta sola a los 30 s si el proceso muere. No usa el bloqueo de sesión de Postgres a propósito:
la `DATABASE_URL` de Neon pasa por su pooler, que reparte las consultas de una misma sesión entre
conexiones distintas, y un bloqueo de sesión podría no soltarse. Solo bloquea si hay migraciones
pendientes.

Se aplican en un job y no al arrancar la API por cuatro motivos. Con varias instancias arrancando no
compiten por migrar. Una migración larga no choca con el tiempo de arranque que da Cloud Run. Si
falla, el despliegue se para antes de mandar tráfico a la revisión nueva. Y volver a una revisión
anterior no toca el esquema.

### El historial de Prisma

Las bases de beta y producción las migró Prisma, que guarda lo aplicado en `_prisma_migrations`. La
primera vez que `migrate` corre sobre una de ellas, crea `goose_db_version`, apunta como aplicadas
las migraciones que Prisma terminó y luego aplica solo las que faltan: producción, que va por
detrás, se pone al día sola. Si Prisma dejó una migración a medias, o aplicó una que goose no
tiene, para sin tocar nada. `_prisma_migrations` se queda donde está.

## Replicar la base

Una base vacía se monta corriendo las migraciones desde cero, que tarda menos de un segundo:
`schema.sql` sirve para leer el esquema, no para crearlo, así que no hay dos fuentes que puedan
dejar de coincidir.

## Tests

`go test ./...` levanta `postgres:18-alpine` con testcontainers, así que necesita Docker.

- `TestMain` migra una base vacía.
- `TestSchemaIsUpToDate` compara `schema.sql` con el `pg_dump` de esa base.
- `TestMigrateTakesOverThePrismaHistory` simula una base de Prisma a la que le faltan las dos últimas
  migraciones y comprueba que acaba con el mismo esquema que una vacía; los otros tests, que se
  niega a adoptar un historial roto.

En el CI, el job `database` pasa `gofmt`, `go vet` y `go test`. Las librerías son las aprobadas en
[librerías](api/librerias.md).
