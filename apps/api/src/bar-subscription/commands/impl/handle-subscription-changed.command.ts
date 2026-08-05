import Stripe from 'stripe';

export class HandleSubscriptionChangedCommand {
  constructor(public readonly subscription: Stripe.Subscription) {}
}
