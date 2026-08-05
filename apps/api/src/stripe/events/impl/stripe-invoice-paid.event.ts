import type { Invoice } from 'stripe';

export class StripeInvoicePaidEvent {
  constructor(public readonly invoice: Invoice) {}
}
