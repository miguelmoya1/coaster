import Stripe from 'stripe';

export class StripeInvoicePaidEvent {
  constructor(public readonly invoice: Stripe.Invoice) {}
}
