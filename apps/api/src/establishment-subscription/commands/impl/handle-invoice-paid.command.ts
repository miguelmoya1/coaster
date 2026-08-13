import Stripe from 'stripe';

export class HandleInvoicePaidCommand {
  constructor(public readonly invoice: Stripe.Invoice) {}
}
