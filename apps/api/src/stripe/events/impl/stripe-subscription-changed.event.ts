import type { Subscription } from 'stripe';

export class StripeSubscriptionChangedEvent {
  constructor(public readonly subscription: Subscription) {}
}
