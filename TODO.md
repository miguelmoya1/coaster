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

## Veri*factu: hay esquema, no hay código

`VERIFACTU.md` son 791 líneas de plan escrito contra este repo, y la migración
`20260825120000_verifactu_w0_invoicing_foundations` ya creó `Invoice` e `InvoiceTaxLine` con todo
lo que pide la AEAT: huella encadenada, `qrPayload`, `aeatStatus`, rectificativas y anulaciones.

**Encima de ese esquema no hay ni una línea de aplicación.** No existe módulo, ni servicio, ni
controlador: `grep` solo lo encuentra en el cliente generado de Prisma. Es el hueco más grande
entre lo que hay en `dev` y un TPV vendible en España.

No es urgente por la razón que dice el propio documento —«no es obligatorio todavía para este caso
y no hay prisa»— y su primera mitad es un TPV mejor con AEAT o sin ella. Pero conviene saber que
está a cero, no a medias.

Un apunte que casi se pierde: la sección 1 de `VERIFACTU.md` dice que la numeración correlativa es
«copiar el primer bloque cambiando el ámbito del lock», y apunta a `time-entry-chain.ts` y
`time-entries.write.repository.ts`. Esos dos ficheros estuvieron borrados entre el 27 de agosto y
el 4 de septiembre, así que ese plan apuntaba a código que no existía. Al devolver el registro
horario han vuelto, y con ellos el punto de partida.

## Producción va muy por detrás de `dev`

Comprobado el 4 de septiembre contra la base de `api-new`: 2 establecimientos, 4 usuarios, 17
comandas, 6 turnos, **0 fichajes**, y **la tabla `Invoice` no existe**. Es decir, los 91 commits
que separan `main` de `dev` —menús, catálogo, cimientos de Veri*factu, notas de comanda— no los ha
visto ningún usuario.

Los 0 fichajes son la otra cara: el registro horario restaurado está probado por 214 e2e y 773
unitarios, pero **nadie lo ha usado nunca en producción**. Antes de contárselo a un cliente como
característica, conviene fichar un día entero desde un local de verdad.

## `MEDIA_BUCKET` en beta

No está puesta en el servicio `api-beta`, así que cae al respaldo del código
(`imagenes-clientes-app`), **que es el bucket de producción**. Las imágenes que subas en beta acaban
ahí, y contradice lo que dice `docs/operations/environments.md`.

Se arregla creando el bucket de beta (las tres órdenes están en ese documento) o poniendo la
variable explícitamente, para dejar claro que apunta a producción a propósito.
