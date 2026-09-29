# apps/coaster-api

Reescritura en Go de `apps/api` (NestJS + Prisma). Todavía está en marcha: `apps/api` sigue
siendo la API en producción y la **referencia de comportamiento** hasta el cambio.

## Antes de hacer nada, leer

La documentación está en `docs/apps/coaster-api/`:

1. `README.md`: cómo arrancar y probar.
2. `migracion.md`: objetivos, decisiones, **estado**, **siguiente paso** y diferencias con Nest.
3. `convenciones.md`: cómo se hace cada cosa (rutas, validación, eventos, SQL, tests…).
4. `estructura.md`: la estructura de carpetas y para qué sirve cada una.
5. `librerias.md`: las librerías aprobadas.

## Reglas

- **Sigue `estructura.md`.** Arquitectura hexagonal: `core` (domain + ports), `service` y
  `adapter`. Sin CQRS: un servicio por entidad y un método por caso de uso.
- **Las interfaces de los servicios están en `core/ports`** (`ports.OrderService`…). Los handlers
  y middlewares reciben esas; nunca se declaran interfaces en el archivo del handler.
- **SQL a mano, un archivo `.sql` por consulta**, en `internal/adapter/repository/queries/<entidad>/`,
  cargado con `//go:embed` en una variable por consulta. Consultas simples, sin anidar
  relaciones: si hace falta, dos consultas y se juntan en Go.
- **Solo librerías marcadas ✅ en `librerias.md`.** Si hace falta una que no lo está, preguntar antes.
- **El contrato de la API no cambia**: rutas, JSON, formato de errores, `ErrorCodes` de
  `@coaster/common` y cookies tienen que ser idénticos a `apps/api`. Ante la duda, leer el
  código de `apps/api` y copiar su comportamiento.
- **No tocar `apps/api`**, salvo para adaptar los e2e y lanzarlos contra Go (paquete P4).
- **Miguel está aprendiendo Go**: código idiomático y directo, sin trucos. Las decisiones se
  explican en el chat. **Sin comentarios en el código Go**, ni doc comments; solo directivas como `//go:embed`.
- **Sin código repetido**: antes de escribir un helper, un fake o una consulta, buscar si ya
  existe. Un fake nuevo de un puerto que ya tiene uno amplía ese.
- **Un cambio está terminado** cuando pasan `gofmt -l .` (vacío), `go vet ./...`, `go test ./...`
  y `scripts/e2e-go.sh`, y lo que no se ha podido copiar de Nest está en «Diferencias
  conocidas» de `migracion.md`.
- **Todo va a `dev`, sin ramas**, en commits pequeños. Cada push a `dev` despliega `api-beta`:
  se empuja cuando el cambio está entero.
- **Al terminar algo**, quitarlo del «Siguiente paso» de `migracion.md` (lo hecho no se apunta:
  queda en git) y actualizar `convenciones.md` si cambia cómo se hace algo.
