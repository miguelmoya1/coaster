import Stripe from 'stripe';
import { beforeEach, describe, expect, it } from 'vitest';
import { HandleInvoicePaymentFailedCommand } from '../impl/handle-invoice-payment-failed.command';
import { HandleInvoicePaymentFailedHandler } from './handle-invoice-payment-failed.handler';

describe('HandleInvoicePaymentFailedHandler (bar-subscription)', () => {
  let handler: HandleInvoicePaymentFailedHandler;

  beforeEach(() => {
    handler = new HandleInvoicePaymentFailedHandler();
  });

  it('should execute command successfully for a failed invoice payment', async () => {
    const invoice = { id: 'in_bar_failed_123' } as Stripe.Invoice;
    await expect(handler.execute(new HandleInvoicePaymentFailedCommand(invoice))).resolves.toBeUndefined();
  });
});
