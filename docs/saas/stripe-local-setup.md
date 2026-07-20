# Guía de Configuración Local de Stripe para Coaster

Esta guía detalla paso a paso cómo configurar tu entorno local para probar la integración con Stripe que ya está implementada en el código.

## 1. Crear y configurar productos en Stripe

Para que la aplicación sepa qué planes ofrecer, necesitas configurarlos en el Dashboard de Stripe:

1. Ve a [Stripe Dashboard](https://dashboard.stripe.com/) (asegúrate de estar en modo **Prueba** / **Test Mode**).
2. Ve a la sección **Catálogo de productos** (Products).
3. Crea un producto llamado **Coaster Pro**.
4. Añádele dos precios (Prices):
   - Uno recurrente **Mensual** (ej. 29.99 € / mes).
   - Uno recurrente **Anual** (ej. 299.99 € / año).
5. Copia los IDs de los precios generados. Empiezan por `price_...`.

## 2. Configurar Portal de Cliente (Customer Portal)

Para que los usuarios puedan gestionar sus facturas y cambiar o cancelar su suscripción desde la app:

1. En el Dashboard de Stripe, ve a **Configuración (Settings) > Facturación (Billing) > Portal del cliente**.
2. Habilita el enlace al portal del cliente.
3. Configura qué acciones permites (cancelar suscripciones, cambiar de plan, historial de facturas, etc.).
4. Asegúrate de guardar los cambios.

## 3. Configurar las Variables de Entorno (.env)

Abre el archivo `apps/api/.env` (si no existe, créalo copiando el contenido de `.env_example` y añadiendo lo siguiente):

```env
# Clave secreta de Stripe (la encuentras en Developers > API keys)
# Empieza por sk_test_...
STRIPE_SECRET_KEY="sk_test_..."

# Los IDs de los precios que creaste en el paso 1
STRIPE_PRICE_PRO_MONTHLY="price_..."
STRIPE_PRICE_PRO_YEARLY="price_..."
```

*(El `STRIPE_WEBHOOK_SECRET` lo configuraremos en el siguiente paso).*

## 4. Escuchar Webhooks Localmente (Stripe CLI)

Para que tu servidor local (NestJS) pueda recibir notificaciones de que un pago se ha completado o una suscripción ha sido cancelada, necesitas usar el CLI de Stripe.

1. Instala [Stripe CLI](https://stripe.com/docs/stripe-cli).
2. Inicia sesión en la consola ejecutando:
   ```bash
   stripe login
   ```
3. Inicia el reenvío de webhooks hacia tu API local:
   ```bash
   stripe listen --forward-to localhost:3000/billing/webhook
   ```
4. El terminal te devolverá un secreto para el webhook que empieza por `whsec_...`. Cópialo.
5. Pégalo en tu archivo `apps/api/.env`:
   ```env
   STRIPE_WEBHOOK_SECRET="whsec_..."
   ```
6. Reinicia tu servidor backend de NestJS para que cargue la nueva variable de entorno.

## 5. Probar el flujo completo

Con el frontend, el backend y el `stripe listen` ejecutándose:

1. Entra a Coaster en tu navegador.
2. Ve al menú superior derecho y haz clic en **"Activar plan Pro"**.
3. Se abrirá la pasarela de pago de Stripe.
4. Usa una tarjeta de prueba de Stripe (por ejemplo, `4242 4242 4242 4242`, fecha futura, cualquier CVC).
5. Completa el pago.
6. Observa la consola de `stripe listen`, verás cómo llegan los eventos (`checkout.session.completed`, `customer.subscription.created`).
7. El backend los procesará y tu bar ahora será Premium (podrás verlo reflejado en la base de datos o si haces clic en "Gestionar suscripción y facturas").
