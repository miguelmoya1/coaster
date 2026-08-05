import { EventBus } from '@nestjs/cqrs';
import Stripe from 'stripe';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { asBarId } from '../../../core';
import { SubscriptionRenewedEvent } from '../../events';
import { HandleInvoicePaidCommand } from '../impl/handle-invoice-paid.command';
import { HandleInvoicePaidHandler } from './handle-invoice-paid.handler';

describe('HandleInvoicePaidHandler (billing)', () => {
  let handler: HandleInvoicePaidHandler;
  let readRepoMock: { findSubscriptionsByStripeIds: ReturnType<typeof vi.fn> };
  let writeRepoMock: { markSubscriptionsPaid: ReturnType<typeof vi.fn> };
  let eventBusMock: { publish: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    readRepoMock = {
      findSubscriptionsByStripeIds: vi.fn().mockResolvedValue([]),
    };
    writeRepoMock = {
      markSubscriptionsPaid: vi.fn().mockResolvedValue(undefined),
    };
    eventBusMock = {
      publish: vi.fn().mockResolvedValue(undefined),
    };

    handler = new HandleInvoicePaidHandler(
      readRepoMock as any,
      writeRepoMock as any,
      eventBusMock as unknown as EventBus,
    );
  });

  it('should ignore invoice paid event if customerId and subscriptionId are missing', async () => {
    const invoice = { id: 'in_no_ids' } as Stripe.Invoice;

    await handler.execute(new HandleInvoicePaidCommand(invoice));

    expect(readRepoMock.findSubscriptionsByStripeIds).not.toHaveBeenCalled();
    expect(writeRepoMock.markSubscriptionsPaid).not.toHaveBeenCalled();
    expect(eventBusMock.publish).not.toHaveBeenCalled();
  });

  it('should process invoice paid event with customerId string and subscription string', async () => {
    const barId = asBarId('bar_billing_123');
    const invoice = {
      id: 'in_paid_123',
      customer: 'cus_123',
      parent: {
        subscription_details: {
          subscription: 'sub_123',
        },
      },
    } as any;

    readRepoMock.findSubscriptionsByStripeIds.mockResolvedValue([{ barId }]);

    await handler.execute(new HandleInvoicePaidCommand(invoice));

    expect(readRepoMock.findSubscriptionsByStripeIds).toHaveBeenCalledWith('sub_123', 'cus_123');
    expect(writeRepoMock.markSubscriptionsPaid).toHaveBeenCalledWith('sub_123', 'cus_123');
    expect(eventBusMock.publish).toHaveBeenCalledWith(new SubscriptionRenewedEvent(barId, 'sub_123', undefined));
  });

  it('should process invoice paid event with customer object and subscription object', async () => {
    const barId = asBarId('bar_billing_456');
    const invoice = {
      id: 'in_paid_456',
      customer: { id: 'cus_obj_456' },
      parent: {
        subscription_details: {
          subscription: { id: 'sub_obj_456' },
        },
      },
    } as any;

    readRepoMock.findSubscriptionsByStripeIds.mockResolvedValue([{ barId }]);

    await handler.execute(new HandleInvoicePaidCommand(invoice));

    expect(readRepoMock.findSubscriptionsByStripeIds).toHaveBeenCalledWith('sub_obj_456', 'cus_obj_456');
    expect(writeRepoMock.markSubscriptionsPaid).toHaveBeenCalledWith('sub_obj_456', 'cus_obj_456');
    expect(eventBusMock.publish).toHaveBeenCalledWith(new SubscriptionRenewedEvent(barId, 'sub_obj_456', undefined));
  });
});
