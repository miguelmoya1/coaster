import Stripe from 'stripe';

export class StripeSubscriptionChangedEvent {
  constructor(public readonly subscription: Stripe.Subscription) {}
}
