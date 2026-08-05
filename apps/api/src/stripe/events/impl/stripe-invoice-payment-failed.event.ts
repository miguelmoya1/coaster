import type { Invoice } from 'stripe';

export class StripeInvoicePaymentFailedEvent {
  constructor(public readonly invoice: Invoice) {}
}
