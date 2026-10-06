# apps/api

La API de Coaster, en Go. Sustituye a la de NestJS, que ya no está en el repositorio: beta corre
Go y producción sigue con Nest hasta el merge a `main` (ver `migracion.md`).

## Antes de hacer nada, leer

La documentación está en `docs/apps/api/`:

1. `README.md`: cómo arrancar y probar.
2. `migracion.md`: objetivos, decisiones, **estado**, **siguiente paso** y en qué se diferencia de
   lo que corre en producción.
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
- **El contrato es el de `apps/web`**: rutas, JSON, formato de errores, `ErrorCodes` (los de
  `apps/web/src/app/core/errors/error.types.ts`), permisos, eventos de realtime y cookies. Si
  cambia, cambia a la vez en la web. Los tests de `domain/` comparan los códigos de error, los
  permisos y los eventos con sus ficheros.
- **Miguel está aprendiendo Go**: código idiomático y directo, sin trucos. Las decisiones se
  explican en el chat. **Sin comentarios en el código Go**, ni doc comments; solo directivas como `//go:embed`.
- **Sin código repetido**: antes de escribir un helper, un fake o una consulta, buscar si ya
  existe. Un fake nuevo de un puerto que ya tiene uno amplía ese.
- **Un cambio está terminado** cuando pasan `gofmt -l .` (vacío), `go vet ./...` y
  `go test -count=1 ./...` (los e2e de `e2e/` incluidos: sin `-count=1`, la caché los da por
  pasados aunque cambie la API, porque la compilan en otro proceso). Mientras producción siga con Nest, lo que cambie para la web o
  para los usuarios respecto a producción se apunta en «Diferencias conocidas» de `migracion.md`.
- **Todo va a `dev`, sin ramas**, en commits pequeños. Cada push a `dev` despliega `api-beta`:
  se empuja cuando el cambio está entero.
- **Al terminar algo**, quitarlo del «Siguiente paso» de `migracion.md` (lo hecho no se apunta:
  queda en git) y actualizar `convenciones.md` si cambia cómo se hace algo.
