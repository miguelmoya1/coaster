# Stripe Integration

## Flujo base

1. El owner selecciona plan en Coaster.
2. API crea Checkout Session en Stripe.
3. Stripe procesa el pago en su pasarela.
4. Stripe llama al webhook en API.
5. API actualiza BarSubscription y emite evento de dominio.

## Endpoints API (v1)

- POST /bars/:barId/billing/checkout-session
- POST /bars/:barId/billing/customer-portal-session
- GET /bars/:barId/billing/subscription
- POST /billing/webhook

## Seguridad webhook

- Verificacion de firma con STRIPE_WEBHOOK_SECRET.
- Lectura de raw body para validacion criptografica.
- Idempotencia por stripeEventId.

## Variables de entorno

- STRIPE_SECRET_KEY
- STRIPE_WEBHOOK_SECRET
- STRIPE_PRICE_PRO_MONTHLY
- STRIPE_PRICE_PRO_YEARLY

## Eventos manejados

- checkout.session.completed
- customer.subscription.created
- customer.subscription.updated
- customer.subscription.deleted
- invoice.payment_failed

## Eventos internos emitidos

- SubscriptionRenewedEvent
- SubscriptionCancelledEvent
- SubscriptionPaymentFailedEvent
