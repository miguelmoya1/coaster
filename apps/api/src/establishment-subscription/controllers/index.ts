export * from './establishment-subscription.controller';
export * from './stripe-webhook.controller';

import { EstablishmentSubscriptionController } from './establishment-subscription.controller';
import { StripeWebhookController } from './stripe-webhook.controller';

export const EstablishmentSubscriptionControllers = [EstablishmentSubscriptionController, StripeWebhookController];
