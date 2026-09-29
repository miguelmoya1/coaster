# apps/database

El esquema de la base de datos de Coaster: las migraciones de goose, el binario `migrate` que las
aplica y `schema.sql`, el esquema entero generado desde ellas. Antes de tocar nada, leer
`docs/apps/database.md`.

## Reglas

- **Una migración nueva es un archivo nuevo** en `migrations/`. Las que ya están no se editan:
  ya se han aplicado en beta o en producción. Una migración se corrige con otra.
- **Mientras Nest sirva en algún entorno, una migración no puede romperlo**: se añaden tablas o
  columnas que admiten `null` o tienen valor por defecto, y no se borra ni se renombra nada.
- **`schema.sql` no se escribe a mano**: `go test -run TestSchemaIsUpToDate -update` lo rehace, y
  el mismo test sin `-update` falla si no coincide con las migraciones.
- **Sin comentarios en el código Go**, igual que en `apps/coaster-api`.
- **Un cambio está terminado** cuando pasan `gofmt -l .` (vacío), `go vet ./...` y `go test ./...`
  aquí, y `go test ./...` y `scripts/e2e-go.sh` en `apps/coaster-api`, que montan su base con
  estas migraciones.
