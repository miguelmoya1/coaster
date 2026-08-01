import Stripe from 'stripe';

export class RecordStripeWebhookEventCommand {
  constructor(public readonly event: Stripe.Event) {}
}
