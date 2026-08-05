import type { Checkout } from 'stripe';

export class StripeCheckoutCompletedEvent {
  constructor(public readonly session: Checkout.Session) {}
}
