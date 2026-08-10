import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SubscriptionPaymentFailedEvent } from '../../events';
import { HandleInvoicePaymentFailedCommand } from '../impl/handle-invoice-payment-failed.command';
import { HandleInvoicePaymentFailedHandler } from './handle-invoice-payment-failed.handler';

describe('HandleInvoicePaymentFailedHandler (establishment-subscription)', () => {
  let handler: HandleInvoicePaymentFailedHandler;
  let readRepoMock: any;
  let writeRepoMock: any;
  let eventBusMock: any;

  beforeEach(() => {
    readRepoMock = {
      findByStripeSubscriptionId: vi.fn(),
      findByStripeCustomerId: vi.fn(),
    };
    writeRepoMock = {
      update: vi.fn(),
    };
    eventBusMock = {
      publish: vi.fn(),
    };

    handler = new HandleInvoicePaymentFailedHandler(readRepoMock, writeRepoMock, eventBusMock);
  });

  it('should do nothing when both customerId and subscriptionId are missing', async () => {
    const invoice = { id: 'in_1', customer: null, parent: null } as any;

    await handler.execute(new HandleInvoicePaymentFailedCommand(invoice));

    expect(readRepoMock.findByStripeSubscriptionId).not.toHaveBeenCalled();
    expect(writeRepoMock.update).not.toHaveBeenCalled();
  });

  it('should do nothing when no matching EstablishmentSubscription exists', async () => {
    const invoice = {
      id: 'in_1',
      customer: 'cus_123',
      parent: { subscription_details: { subscription: 'sub_123' } },
    } as any;
    readRepoMock.findByStripeSubscriptionId.mockResolvedValue(null);

    await handler.execute(new HandleInvoicePaymentFailedCommand(invoice));

    expect(writeRepoMock.update).not.toHaveBeenCalled();
  });

  it('should mark the matching subscription PAST_DUE', async () => {
    const invoice = {
      id: 'in_1',
      customer: 'cus_123',
      parent: { subscription_details: { subscription: 'sub_123' } },
    } as any;
    readRepoMock.findByStripeSubscriptionId.mockResolvedValue({
      establishmentId: 'establishment_123',
      status: 'ACTIVE',
    });

    await handler.execute(new HandleInvoicePaymentFailedCommand(invoice));

    expect(writeRepoMock.update).toHaveBeenCalledWith('establishment_123', { status: 'PAST_DUE' });
    expect(eventBusMock.publish).toHaveBeenCalledWith(expect.any(SubscriptionPaymentFailedEvent));
  });

  it('should look up by customerId when subscriptionId is absent', async () => {
    const invoice = { id: 'in_1', customer: 'cus_123', parent: null } as any;
    readRepoMock.findByStripeCustomerId.mockResolvedValue({ establishmentId: 'establishment_123', status: 'ACTIVE' });

    await handler.execute(new HandleInvoicePaymentFailedCommand(invoice));

    expect(readRepoMock.findByStripeCustomerId).toHaveBeenCalledWith('cus_123');
    expect(writeRepoMock.update).toHaveBeenCalledWith('establishment_123', { status: 'PAST_DUE' });
  });
});
