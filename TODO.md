# Pendiente

Lo que está a medias y por qué, para no perderlo entre conversaciones.

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

La clave de API de Resend, la contraseña de la base de Neon y la clave de socio de Fichit se
escribieron en una conversación. Rótalas cuando la beta esté estable.

## Facturación: mantenimiento y escalado a cero

La purga de claves de idempotencia y el ajuste de cantidades con Stripe corren en un temporizador
dentro del servicio de Fichit, y Cloud Run congela la instancia cuando no hay tráfico. No importa
mientras nadie pague; con suscripciones de verdad, la respuesta es `--min-instances=1` o un Cloud
Scheduler.

## Frontend de Fichit

No existe. El panel de plataforma se opera por HTTP (`/api/v1/platform/*`) y el enlace de acceso
hay que canjearlo a mano con `POST /api/v1/auth/magic-link/verify`. Va en otro repositorio, más
adelante.
