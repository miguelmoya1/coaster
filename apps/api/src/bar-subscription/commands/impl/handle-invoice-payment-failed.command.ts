import Stripe from 'stripe';

export class HandleInvoicePaymentFailedCommand {
  constructor(public readonly invoice: Stripe.Invoice) {}
}
