import Stripe from 'stripe';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SubscriptionPaymentFailedEvent } from '../../events';
import { HandleInvoicePaymentFailedCommand } from '../impl/handle-invoice-payment-failed.command';
import { HandleInvoicePaymentFailedHandler } from './handle-invoice-payment-failed.handler';

describe('HandleInvoicePaymentFailedHandler', () => {
  let handler: HandleInvoicePaymentFailedHandler;
  let readRepoMock: any;
  let writeRepoMock: any;
  let eventBusMock: any;

  beforeEach(() => {
    readRepoMock = {
      findSubscriptionsByStripeIds: vi.fn(),
    };
    writeRepoMock = {
      updateManySubscriptionsStatusToPastDue: vi.fn(),
    };
    eventBusMock = {
      publish: vi.fn(),
    };

    handler = new HandleInvoicePaymentFailedHandler(readRepoMock as any, writeRepoMock as any, eventBusMock as any);
  });

  it('should return early if customerId and subscriptionId are missing', async () => {
    const invoice = {} as Stripe.Invoice;
    await handler.execute(new HandleInvoicePaymentFailedCommand(invoice));

    expect(readRepoMock.findSubscriptionsByStripeIds).not.toHaveBeenCalled();
    expect(writeRepoMock.updateManySubscriptionsStatusToPastDue).not.toHaveBeenCalled();
  });

  it('should update subscriptions status to PAST_DUE and publish SubscriptionPaymentFailedEvent', async () => {
    const invoice = { customer: 'cus_123' } as Stripe.Invoice;
    readRepoMock.findSubscriptionsByStripeIds.mockResolvedValue([{ barId: 'bar_123' }]);

    await handler.execute(new HandleInvoicePaymentFailedCommand(invoice));

    expect(writeRepoMock.updateManySubscriptionsStatusToPastDue).toHaveBeenCalledWith(null, 'cus_123');
    expect(eventBusMock.publish).toHaveBeenCalledWith(expect.any(SubscriptionPaymentFailedEvent));
  });
});
