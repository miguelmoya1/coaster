export * from './bar-subscription.controller';
export * from './stripe-webhook.controller';

import { BarSubscriptionController } from './bar-subscription.controller';
import { StripeWebhookController } from './stripe-webhook.controller';

export const BarSubscriptionControllers = [BarSubscriptionController, StripeWebhookController];
