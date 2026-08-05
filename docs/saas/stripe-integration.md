# Stripe Integration

## Arquitectura de modulos

El antiguo modulo `billing` esta eliminado. La integracion vive en dos modulos con una unica
direccion de dependencia: `bar-subscription` -> `stripe`.

**`stripe/`** — adaptador de infraestructura. No sabe nada de bares.

- `StripeClient`: instancia perezosa del SDK.
- `StripeApi`: unico punto del codigo que llama a `stripe.*`. Normaliza los errores de Stripe
  (`resource_missing` -> `null`, resto -> `ErrorCodes` de aplicacion).
- `StripeWebhookGuard`: verifica la firma y adjunta el evento a la request.
- `StripeWebhookController` + `StripeWebhookWriteRepository`: recibe, reclama (idempotencia) y
  marca el resultado del evento.
- Publica `StripeCheckoutCompletedEvent`, `StripeSubscriptionChangedEvent`,
  `StripeInvoicePaidEvent`, `StripeInvoicePaymentFailedEvent`.

**`bar-subscription/`** — dominio. Contiene las reglas de negocio.

- Sagas que traducen los eventos de Stripe a comandos del dominio.
- Handlers de proyeccion que escriben el read model `BarSubscription`.
- Casos de uso (`CreateCheckoutSessionCommand`, `CreateCustomerPortalSessionCommand`) que aplican
  las reglas (suscripcion ya existente, cancelacion pendiente, customer obsoleto) y delegan en
  `StripeApi`.

Las sesiones de Checkout/Portal **no** viven en `stripe` a proposito: necesitan consultar el
estado local del bar, y moverlas alli crearia una dependencia circular entre ambos modulos.

## Flujo base

1. El owner selecciona plan en Coaster.
2. API crea Checkout Session en Stripe.
3. Stripe procesa el pago en su pasarela.
4. Stripe llama al webhook en API.
5. API actualiza BarSubscription y emite evento de dominio.

## Endpoints API (v1)

- POST /api/v1/bars/:barId/bar-subscription/checkout-session
- POST /api/v1/bars/:barId/bar-subscription/customer-portal-session
- GET /api/v1/bars/:barId/bar-subscription
- POST /api/v1/stripe/webhook

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
