# Stripe setup

How to get Stripe working locally and in production. For how the integration behaves, see
[Stripe integration](stripe-integration.md).

## Local

### 1. Create the product

In the [Stripe Dashboard](https://dashboard.stripe.com/), in **Test mode**:

1. **Product catalog** → create a product called **Coaster Pro**.
2. Give it a single recurring **monthly** price.
3. Copy the generated price id (`price_...`).

### 2. Enable the Customer Portal

**Settings → Billing → Customer portal**: enable it and choose what customers may do (cancel, switch
plan, see invoices). Save. Without this, the "manage billing" button in the app fails.

### 3. Environment variables

In `apps/api/.env` (copy `.env_example` if it does not exist):

```env
STRIPE_SECRET_KEY="sk_test_..."
STRIPE_PRICE_PRO="price_..."
FRONTEND_URL="http://localhost:4200"
```

### 4. Forward webhooks

`docker compose up` already starts a `stripe` service that runs `stripe listen --forward-to
http://api:3000/api/v1/stripe/webhook` using the key from `apps/api/.env`. Its log prints the signing
secret on startup:

```bash
docker compose logs stripe | grep "signing secret"
```

Put that value in `apps/api/.env` and restart the API:

```env
STRIPE_WEBHOOK_SECRET="whsec_..."
```

To run the CLI yourself instead:

```bash
stripe login
stripe listen --forward-to localhost:3000/api/v1/stripe/webhook
```

### 5. Try it

With the front end, the API and `stripe listen` running:

1. Open Coaster, go to the top-right menu and choose **Activate Pro**.
2. Pay with a test card (`4242 4242 4242 4242`, any future date, any CVC).
3. Watch the `stripe listen` output: `checkout.session.completed` and
   `customer.subscription.created` arrive.
4. The API links customer and subscription and projects the state onto `EstablishmentSubscription`.

You can also fire an event without going through the UI:

```bash
docker compose exec stripe stripe trigger customer.subscription.updated --api-key "$STRIPE_SECRET_KEY"
```

Synthetic events like that belong to no establishment, so the API acknowledges them with 201 and logs why —
that is expected, not a failure.

## Production

`STRIPE_WEBHOOK_SECRET` is **required**. `StripeWebhookGuard` verifies every notification's
signature; if the variable is missing or wrong, every webhook is rejected and subscriptions never
activate.

### 1. Live keys and product

With **Test mode off**:

- **Developers → API keys**: copy the secret key (`sk_live_...`).
- **Product catalog**: create the product with a single monthly price (`price_...`).
- **Settings → Billing → Customer portal**: enable and configure it in Live mode too.

### 2. Register the webhook endpoint

**Developers → Webhooks → Add endpoint**, pointing at your public API:

```text
https://<your-api-domain>/api/v1/stripe/webhook
```

Select exactly the events the application handles:

```text
checkout.session.completed
customer.subscription.created
customer.subscription.updated
customer.subscription.deleted
invoice.paid
invoice.payment_failed
```

Open the endpoint and reveal its **signing secret** (`whsec_...`).

### 3. Set the variables

```env
STRIPE_SECRET_KEY="sk_live_..."
STRIPE_PRICE_PRO="price_..."
STRIPE_WEBHOOK_SECRET="whsec_..."
FRONTEND_URL="https://<your-app-domain>"
```

## Local vs production

| Concept          | Local                                     | Production                                 |
| ---------------- | ----------------------------------------- | ------------------------------------------ |
| Stripe mode      | Test (`sk_test_...`)                      | Live (`sk_live_...`)                       |
| Webhook delivery | `stripe listen` forwards to the local API | Stripe POSTs straight to your HTTPS domain |
| `whsec_...`      | Printed by the CLI, changes on each run   | Created once in the Dashboard              |
