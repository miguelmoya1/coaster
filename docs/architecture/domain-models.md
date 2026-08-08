# Domain Models (Resumen)

## Que vive en `@coaster/common`

Todo lo que API y front necesitan **igual** vive en el paquete compartido, nunca duplicado a los
dos lados:

- Interfaces y DTOs del dominio.
- Enums y constantes (`BarRole`, `Role`, `SubscriptionPlan`, `ErrorCodes`, ...).
- `domain/permissions` — la tabla de permisos y `hasPermission`.
- `domain/pricing` — el motor de precios de pedidos.
- `utils/brands` — los constructores de tipos marcados (`asBarId`, `asBarRole`, ...).
- `utils/stock` — el calculo de estado de stock.

Regla: si la logica es identica en ambos lados, va aqui. Cada `core` solo guarda lo que es propio
de su entorno (Prisma y guards de Nest en la API; interceptores y servicios de sesion en el front).

## Contextos actuales

- Bares y membresias
- Catalogo (categorias y productos)
- Mesas y pedidos
- Turnos e intercambios
- Impresion
- Billing (Stripe y concesiones manuales)
- Administracion de plataforma

## Billing

- BarSubscription
  - plan: FREE | PRO
  - status: INACTIVE | TRIALING | ACTIVE | PAST_DUE | CANCELED | UNPAID | EXPIRED
  - stripeCustomerId / stripeSubscriptionId
  - ventanas de periodo y estado de cancelacion
  - **concesion manual**: manualPlan, manualGrantExpiresAt, manualGrantReason, manualGrantedById
    y manualGrantedAt

  Las columnas de concesion viven aparte de las de Stripe a proposito: un webhook actualiza la
  facturacion sin pisar lo que un admin haya concedido, y siempre se puede distinguir el acceso
  pagado del regalado. Detalle en [Modelo de acceso](permissions.md).

- StripeWebhookEvent
  - Idempotencia por stripeEventId
  - Payload completo para auditoria tecnica
  - processingStatus, attempts, lastError y processedAt para reintentos seguros

## Administracion

- AdminAuditLog
  - actor (`User`), accion, tipo y id del objetivo, etiqueta legible
  - motivo opcional y `metadata` JSON con el antes y el despues
  - indexado por fecha y por objetivo

## Eventos de dominio de billing

- SubscriptionRenewedEvent
- SubscriptionCancelledEvent
- SubscriptionPaymentFailedEvent
- SubscriptionOverriddenEvent — un admin concedio o retiro un plan a mano

Los tres primeros se emiten al procesar webhooks; el cuarto, desde el backoffice. Todos acaban en
el mismo handler de websockets, que avisa a los clientes del bar con `subscriptionUpdated`.

## Eventos de dominio de miembros

- MemberInvitedEvent
- MemberRemovedEvent
- MemberRoleChangedEvent — sale por socket como `memberRoleChanged`, para que la lista de equipo y
  los permisos del propio afectado se refresquen sin recargar la pagina
