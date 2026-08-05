import Stripe from 'stripe';
import { beforeEach, describe, expect, it } from 'vitest';
import { HandleInvoicePaidCommand } from '../impl/handle-invoice-paid.command';
import { HandleInvoicePaidHandler } from './handle-invoice-paid.handler';

describe('HandleInvoicePaidHandler (bar-subscription)', () => {
  let handler: HandleInvoicePaidHandler;

  beforeEach(() => {
    handler = new HandleInvoicePaidHandler();
  });

  it('should execute command successfully for a paid invoice', async () => {
    const invoice = { id: 'in_bar_paid_123' } as Stripe.Invoice;
    await expect(handler.execute(new HandleInvoicePaidCommand(invoice))).resolves.toBeUndefined();
  });
});
