import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SubscriptionRenewedEvent } from '../../events';
import { HandleInvoicePaidCommand } from '../impl/handle-invoice-paid.command';
import { HandleInvoicePaidHandler } from './handle-invoice-paid.handler';

describe('HandleInvoicePaidHandler (bar-subscription)', () => {
  let handler: HandleInvoicePaidHandler;
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

    handler = new HandleInvoicePaidHandler(readRepoMock, writeRepoMock, eventBusMock);
  });

  it('should do nothing when both customerId and subscriptionId are missing', async () => {
    const invoice = { id: 'in_1', customer: null, parent: null } as any;

    await handler.execute(new HandleInvoicePaidCommand(invoice));

    expect(readRepoMock.findByStripeSubscriptionId).not.toHaveBeenCalled();
    expect(writeRepoMock.update).not.toHaveBeenCalled();
  });

  it('should do nothing when no matching BarSubscription exists', async () => {
    const invoice = {
      id: 'in_1',
      customer: 'cus_123',
      parent: { subscription_details: { subscription: 'sub_123' } },
    } as any;
    readRepoMock.findByStripeSubscriptionId.mockResolvedValue(null);

    await handler.execute(new HandleInvoicePaidCommand(invoice));

    expect(writeRepoMock.update).not.toHaveBeenCalled();
  });

  it('should leave an already-active subscription untouched', async () => {
    const invoice = {
      id: 'in_1',
      customer: 'cus_123',
      parent: { subscription_details: { subscription: 'sub_123' } },
    } as any;
    readRepoMock.findByStripeSubscriptionId.mockResolvedValue({ barId: 'bar_123', status: 'ACTIVE' });

    await handler.execute(new HandleInvoicePaidCommand(invoice));

    expect(writeRepoMock.update).not.toHaveBeenCalled();
  });

  it('should recover a PAST_DUE subscription back to ACTIVE', async () => {
    const invoice = {
      id: 'in_1',
      customer: 'cus_123',
      parent: { subscription_details: { subscription: 'sub_123' } },
    } as any;
    readRepoMock.findByStripeSubscriptionId.mockResolvedValue({ barId: 'bar_123', status: 'PAST_DUE' });

    await handler.execute(new HandleInvoicePaidCommand(invoice));

    expect(writeRepoMock.update).toHaveBeenCalledWith('bar_123', { status: 'ACTIVE' });
    expect(eventBusMock.publish).toHaveBeenCalledWith(expect.any(SubscriptionRenewedEvent));
  });

  it('should recover an UNPAID subscription looked up by customerId when subscriptionId is absent', async () => {
    const invoice = { id: 'in_1', customer: 'cus_123', parent: null } as any;
    readRepoMock.findByStripeCustomerId.mockResolvedValue({ barId: 'bar_123', status: 'UNPAID' });

    await handler.execute(new HandleInvoicePaidCommand(invoice));

    expect(readRepoMock.findByStripeCustomerId).toHaveBeenCalledWith('cus_123');
    expect(writeRepoMock.update).toHaveBeenCalledWith('bar_123', { status: 'ACTIVE' });
  });
});
