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
- `StripeWebhookDispatcher`: entrega `StripeCheckoutCompletedEvent`,
  `StripeSubscriptionChangedEvent`, `StripeInvoicePaidEvent` y `StripeInvoicePaymentFailedEvent`
  a los consumidores registrados, **esperandolos**.

**`bar-subscription/`** — dominio. Contiene las reglas de negocio.

- `BarSubscriptionWebhookConsumer`: se registra en el dispatcher y traduce cada evento de Stripe
  a un comando del dominio, con `await`.
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
- Entrega **sincrona**: el webhook solo responde 2xx cuando la proyeccion se ha aplicado. Si un
  handler falla, el evento queda `FAILED` con el motivo, la API responde 5xx y Stripe reintenta;
  el reintento vuelve a reclamar el evento e incrementa `attempts`. No se usa saga ni event bus
  para esto precisamente porque ninguno de los dos espera al handler.
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

| Evento                              | Lo consume                                                              |
| ----------------------------------- | ----------------------------------------------------------------------- |
| SubscriptionRenewedEvent            | `SubscriptionUpdatedHandler` -> socket `subscriptionUpdated`             |
| SubscriptionCancelledEvent          | `SubscriptionUpdatedHandler` -> socket `subscriptionUpdated`             |
| SubscriptionPaymentFailedEvent      | `SubscriptionUpdatedHandler` -> socket `subscriptionUpdated`             |
| DuplicateSubscriptionDetectedEvent  | `DuplicateSubscriptionDetectedHandler` -> log de incidente de facturacion |

El evento de duplicado se emite cuando un segundo checkout completa sobre un bar que ya tenia una
suscripcion viva. La duplicada se cancela sola, pero el cliente puede haber sido cobrado y no hay
devolucion automatica: hoy solo queda registrado en el log, y ese handler es el sitio donde colgar
un aviso real (email, Slack) cuando se decida el destinatario.

## Desarrollo local

`docker compose up` levanta un servicio `stripe` que reenvia los eventos a la API. Para hacerlo a
mano:

```sh
stripe listen --forward-to localhost:3000/api/v1/stripe/webhook
```

El `whsec_...` que imprime es el `STRIPE_WEBHOOK_SECRET` de `apps/api/.env`.

## Estado de la suscripcion

`checkout.session.completed` no espera a `customer.subscription.*`: relee la suscripcion de Stripe
y escribe plan, estado y periodos en el momento. Una lectura en vivo siempre es igual o mas fresca
que cualquier webhook ya procesado, asi que no puede pisar datos mas nuevos. Si Stripe todavia no
conoce la suscripcion, se enlazan las referencias como INACTIVE y el evento posterior la corrige.

`SubscriptionActiveGuard` (global, solo escrituras) es quien corta el acceso. Un bar sin fila en
`BarSubscription` se considera sin suscripcion, de ahi que crear un bar cree tambien su trial y que
exista una migracion de backfill para los bares anteriores al modulo de facturacion.
