# Domain Models (Resumen)

## Contextos actuales

- Bares y membresias
- Catalogo (categorias y productos)
- Mesas y pedidos
- Turnos e intercambios
- Impresion
- Billing (Stripe)

## Billing

Modelos de persistencia introducidos en Fase 1:

- BarSubscription
  - plan: FREE | PRO_MONTHLY | PRO_YEARLY
  - status: INACTIVE | TRIALING | ACTIVE | PAST_DUE | CANCELED | UNPAID
  - stripeCustomerId / stripeSubscriptionId
  - ventanas de periodo y estado de cancelacion

- StripeWebhookEvent
  - Idempotencia por stripeEventId
  - Payload completo para auditoria tecnica

## Eventos de dominio de billing

- SubscriptionRenewedEvent
- SubscriptionCancelledEvent
- SubscriptionPaymentFailedEvent

Estos eventos se emiten tras procesar webhooks y permiten desacoplar notificaciones, limites o automatizaciones futuras.
