import Stripe from 'stripe';

export class StripeInvoicePaymentFailedEvent {
  constructor(public readonly invoice: Stripe.Invoice) {}
}
