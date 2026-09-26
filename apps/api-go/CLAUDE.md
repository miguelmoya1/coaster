# apps/api-go

Reescritura en Go de `apps/api` (NestJS + Prisma). Todavía está en marcha: `apps/api` sigue
siendo la API en producción y la **referencia de comportamiento** hasta el cambio.

## Antes de hacer nada, leer

1. `MIGRACION.md`: objetivos, decisiones, paquetes de trabajo, **estado** y **siguiente paso**.
2. `ESTRUCTURA.md`: la estructura de carpetas y para qué sirve cada una.
3. `LIBRERIAS.md`: las librerías candidatas y cuáles están aprobadas.

## Reglas

- **Sigue `ESTRUCTURA.md`.** Arquitectura hexagonal: `core` (domain + ports), `service` y
  `adapter`. Sin CQRS: un servicio por entidad y un método por caso de uso.
- **SQL a mano, un archivo `.sql` por consulta**, en `internal/adapter/repository/queries/<entidad>/`,
  cargado con `//go:embed` en una variable por consulta. Consultas simples, sin anidar
  relaciones: si hace falta, dos consultas y se juntan en Go.
- **Solo librerías marcadas ✅ en `LIBRERIAS.md`.** Si hace falta una que no lo está, preguntar antes.
- **El contrato de la API no cambia**: rutas, JSON, formato de errores, `ErrorCodes` de
  `@coaster/common` y cookies tienen que ser idénticos a `apps/api`. Ante la duda, leer el
  código de `apps/api` y copiar su comportamiento.
- **No tocar `apps/api`**, salvo para adaptar los e2e y lanzarlos contra Go (paquete P4).
- **Miguel está aprendiendo Go**: código idiomático y directo, sin trucos. Las decisiones se
  explican en el chat, no en comentarios del código.
- **Al terminar un paquete**, actualizar la tabla de estado y el siguiente paso de `MIGRACION.md`.
