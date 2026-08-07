import Stripe from 'stripe';

export class HandleCheckoutCompletedCommand {
  constructor(public readonly session: Stripe.Checkout.Session) {}
}
