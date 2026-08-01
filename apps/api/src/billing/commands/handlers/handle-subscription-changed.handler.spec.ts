import Stripe from 'stripe';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SubscriptionCancelledEvent, SubscriptionRenewedEvent } from '../../events';
import { HandleSubscriptionChangedCommand } from '../impl/handle-subscription-changed.command';
import { HandleSubscriptionChangedHandler } from './handle-subscription-changed.handler';

describe('HandleSubscriptionChangedHandler', () => {
  let handler: HandleSubscriptionChangedHandler;
  let readRepoMock: any;
  let writeRepoMock: any;
  let configServiceMock: any;
  let eventBusMock: any;

  beforeEach(() => {
    readRepoMock = {
      findSubscriptionByStripeIds: vi.fn(),
    };
    writeRepoMock = {
      upsertSubscriptionDetails: vi.fn(),
    };
    configServiceMock = {
      get: vi.fn(),
    };
    eventBusMock = {
      publish: vi.fn(),
    };

    handler = new HandleSubscriptionChangedHandler(
      readRepoMock as any,
      writeRepoMock as any,
      configServiceMock,
      eventBusMock as any,
    );
  });

  it('should return early if customer is missing', async () => {
    const subscription = { id: 'sub_123' } as Stripe.Subscription;
    await handler.execute(new HandleSubscriptionChangedCommand(subscription));

    expect(writeRepoMock.upsertSubscriptionDetails).not.toHaveBeenCalled();
  });

  it('should return early if barId cannot be resolved', async () => {
    const subscription = { id: 'sub_123', customer: 'cus_123', items: { data: [] } } as any;
    readRepoMock.findSubscriptionByStripeIds.mockResolvedValue(null);

    await handler.execute(new HandleSubscriptionChangedCommand(subscription));

    expect(writeRepoMock.upsertSubscriptionDetails).not.toHaveBeenCalled();
  });

  it('should upsert subscription and publish SubscriptionRenewedEvent for active status', async () => {
    const subscription = {
      id: 'sub_123',
      customer: 'cus_123',
      status: 'active',
      cancel_at_period_end: false,
      canceled_at: null,
      items: { data: [{ current_period_start: 1000, current_period_end: 2000, price: { id: 'price_1' } }] },
    } as any;

    readRepoMock.findSubscriptionByStripeIds.mockResolvedValue({ barId: 'bar_123' });

    await handler.execute(new HandleSubscriptionChangedCommand(subscription));

    expect(writeRepoMock.upsertSubscriptionDetails).toHaveBeenCalledWith(
      'bar_123',
      expect.objectContaining({
        stripeCustomerId: 'cus_123',
        stripeSubscriptionId: 'sub_123',
        status: 'ACTIVE',
      }),
    );
    expect(eventBusMock.publish).toHaveBeenCalledWith(expect.any(SubscriptionRenewedEvent));
  });

  it('should publish SubscriptionCancelledEvent if canceled or cancel_at_period_end', async () => {
    const subscription = {
      id: 'sub_123',
      customer: 'cus_123',
      status: 'canceled',
      cancel_at_period_end: true,
      canceled_at: 1500,
      items: { data: [] },
    } as any;

    readRepoMock.findSubscriptionByStripeIds.mockResolvedValue({ barId: 'bar_123' });

    await handler.execute(new HandleSubscriptionChangedCommand(subscription));

    expect(eventBusMock.publish).toHaveBeenCalledWith(expect.any(SubscriptionCancelledEvent));
  });
});
