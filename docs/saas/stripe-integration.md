# Stripe Integration

## Flujo base

1. El owner selecciona plan en Coaster.
2. API crea Checkout Session en Stripe.
3. Stripe procesa el pago en su pasarela.
4. Stripe llama al webhook en API.
5. API actualiza BarSubscription y emite evento de dominio.

## Endpoints API (v1)

- POST /api/v1/bars/:barId/billing/checkout-session
- POST /api/v1/bars/:barId/billing/customer-portal-session
- GET /api/v1/bars/:barId/billing/subscription
- POST /api/v1/billing/webhook

## Seguridad webhook

- Verificacion de firma con STRIPE_WEBHOOK_SECRET.
- Lectura de raw body para validacion criptografica.
- Idempotencia por stripeEventId.
- Estado persistente de procesamiento, intentos y último error para permitir reintentos seguros.
- `BarSubscription` es un read model local: Customer, Subscription, plan, estado y periodos solo se escriben desde webhooks.

## Variables de entorno

- STRIPE_SECRET_KEY
- STRIPE_WEBHOOK_SECRET
- STRIPE_PRICE_PRO
- FRONTEND_URL

## Eventos manejados

- checkout.session.completed
- customer.subscription.created
- customer.subscription.updated
- customer.subscription.deleted
- customer.subscription.paused / customer.subscription.resumed
- invoice.payment_failed
- invoice.paid

## Eventos internos emitidos

- SubscriptionRenewedEvent
- SubscriptionCancelledEvent
- SubscriptionPaymentFailedEvent
