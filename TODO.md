# Pendiente

Lo que está a medias y por qué, para no perderlo entre conversaciones.

> Coaster y Fichit son dos productos separados desde el 4 de septiembre de 2026, sin código ni
> credenciales en común. Lo que queda aquí de Fichit son los dos sitios donde comparten
> **infraestructura** —la cuenta de correo y las claves que pasaron por un chat—, no dependencias.
> El detalle de la separación está en `SEPARACION.md`, en la raíz de `dev/`.

## Correo: dominio propio

**Ahora mismo Fichit envía desde `fichit@miguelmo.dev`** y Coaster desde
`hello@coaster.business`. Es un apaño hasta comprar el dominio definitivo.

Cuando lo tengas, hay que tocar **dos sitios**:

| Dónde | Qué | Cómo |
| :--- | :--- | :--- |
| Fichit | `FICHIT_SMTP_FROM` | Desde el panel, `PUT /api/v1/platform/settings`, sin desplegar |
| Coaster | `hello@coaster.business` | Está **a fuego** en `apps/api/src/email/email.service.ts` |

Lo de Coaster es el que se olvida: no es una variable de entorno, es una cadena en el código.

## Resend: dos cuentas, o una con un problema

La clave que usa Fichit beta y la que usa **Coaster en producción son distintas**. En la cuenta
de Fichit solo está `miguelmo.dev` (verificado). `coaster.business` no aparece ahí.

Si resultara ser la misma cuenta, los correos de invitación de Coaster estarían fallando **en
silencio**: `EmailService.sendInviteEmail` captura el error y solo lo registra, así que nadie se
entera de que la invitación no llegó. Merece una comprobación.

## Rotar lo que pasó por el chat

La clave de API de Resend y la contraseña de la base de Neon se escribieron en una conversación.
Rótalas cuando la beta esté estable.

La clave de socio de Fichit ya no hace falta rotarla: el mecanismo de socio se retiró y la tabla
`partners` no existe, así que la credencial murió con ella.

## Registro horario: la conservación de cuatro años

El art. 34.9 pide conservar el registro cuatro años. Hoy eso se sostiene porque las claves foráneas
de `TimeEntry` son `RESTRICT` y nadie borra, pero **no hay política escrita ni purga automática**.
No es urgente —lo que la ley castiga es no conservarlo, no conservarlo de más— pero conviene que
esté dicho en `docs/operations/time-tracking.md` antes de que se olvide.

El contraste completo contra la normativa vigente está en `NORMATIVA.md`, en la raíz de `dev/`.

## `MEDIA_BUCKET` en beta

No está puesta en el servicio `api-beta`, así que cae al respaldo del código
(`imagenes-clientes-app`), **que es el bucket de producción**. Las imágenes que subas en beta acaban
ahí, y contradice lo que dice `docs/operations/environments.md`.

Se arregla creando el bucket de beta (las tres órdenes están en ese documento) o poniendo la
variable explícitamente, para dejar claro que apunta a producción a propósito.
