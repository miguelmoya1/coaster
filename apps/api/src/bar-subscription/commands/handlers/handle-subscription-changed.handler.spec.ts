import { ErrorCodes } from '@coaster/common';
import { InternalServerErrorException } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SubscriptionCancelledEvent, SubscriptionRenewedEvent } from '../../events';
import { HandleSubscriptionChangedCommand } from '../impl/handle-subscription-changed.command';
import { HandleSubscriptionChangedHandler } from './handle-subscription-changed.handler';

describe('HandleSubscriptionChangedHandler (bar-subscription)', () => {
  let handler: HandleSubscriptionChangedHandler;
  let readRepoMock: any;
  let writeRepoMock: any;
  let configServiceMock: any;
  let eventBusMock: any;
  let stripeApiMock: any;

  beforeEach(() => {
    readRepoMock = {
      findByStripeSubscriptionId: vi.fn(),
      findByStripeCustomerId: vi.fn(),
    };
    writeRepoMock = {
      upsert: vi.fn(),
    };
    configServiceMock = {
      get: vi.fn().mockReturnValue('price_pro'),
    };
    eventBusMock = {
      publish: vi.fn(),
    };

    stripeApiMock = {
      retrieveSubscription: vi.fn().mockResolvedValue(null),
      cancelSubscription: vi.fn().mockResolvedValue(true),
    };

    handler = new HandleSubscriptionChangedHandler(
      readRepoMock,
      writeRepoMock,
      configServiceMock,
      eventBusMock,
      stripeApiMock,
    );
  });

  it('should ignore events for a subscription this bar does not track', async () => {
    readRepoMock.findByStripeSubscriptionId.mockResolvedValue(null);
    readRepoMock.findByStripeCustomerId.mockResolvedValue({ barId: 'bar-1', stripeSubscriptionId: 'sub_live' });
    stripeApiMock.retrieveSubscription.mockResolvedValue({ id: 'sub_live', status: 'active' });

    const cancelledDuplicate = {
      id: 'sub_duplicate',
      customer: 'cus_123',
      status: 'canceled',
      items: { data: [] },
    } as any;

    await handler.execute(new HandleSubscriptionChangedCommand(cancelledDuplicate));

    expect(writeRepoMock.upsert).not.toHaveBeenCalled();
  });

  it('should process events for a subscription that replaced a dead one', async () => {
    readRepoMock.findByStripeSubscriptionId.mockResolvedValue(null);
    readRepoMock.findByStripeCustomerId.mockResolvedValue({ barId: 'bar-1', stripeSubscriptionId: 'sub_old' });
    stripeApiMock.retrieveSubscription.mockResolvedValue({ id: 'sub_old', status: 'canceled' });

    const replacement = {
      id: 'sub_new',
      customer: 'cus_123',
      status: 'active',
      items: { data: [{ price: { id: 'price_pro' }, current_period_end: 1800000000 }] },
    } as any;

    await handler.execute(new HandleSubscriptionChangedCommand(replacement));

    expect(writeRepoMock.upsert).toHaveBeenCalled();
  });

  it('should fail if customerId is missing', async () => {
    const subscription = { id: 'sub_123', customer: null } as any;

    await expect(handler.execute(new HandleSubscriptionChangedCommand(subscription))).rejects.toEqual(
      new InternalServerErrorException(ErrorCodes.STRIPE_WEBHOOK_CUSTOMER_MISSING),
    );
    expect(writeRepoMock.upsert).not.toHaveBeenCalled();
  });

  it('should acknowledge a subscription that belongs to no bar instead of making Stripe retry it', async () => {
    const subscription = { id: 'sub_123', customer: 'cus_123', items: { data: [] } } as any;
    readRepoMock.findByStripeSubscriptionId.mockResolvedValue(null);
    readRepoMock.findByStripeCustomerId.mockResolvedValue(null);

    await expect(handler.execute(new HandleSubscriptionChangedCommand(subscription))).resolves.toBeUndefined();
    expect(writeRepoMock.upsert).not.toHaveBeenCalled();
  });

  it('should set status ACTIVE and populate period dates for an active subscription', async () => {
    const subscription = {
      id: 'sub_123',
      customer: 'cus_123',
      status: 'active',
      cancel_at: null,
      cancel_at_period_end: false,
      canceled_at: null,
      trial_end: null,
      items: { data: [{ current_period_start: 1000, current_period_end: 2000, price: { id: 'price_pro' } }] },
    } as any;
    readRepoMock.findByStripeSubscriptionId.mockResolvedValue({ barId: 'bar_123' });

    await handler.execute(new HandleSubscriptionChangedCommand(subscription));

    expect(writeRepoMock.upsert).toHaveBeenCalledWith(
      'bar_123',
      expect.objectContaining({
        stripeCustomerId: 'cus_123',
        stripeSubscriptionId: 'sub_123',
        plan: 'PRO',
        status: 'ACTIVE',
        currentPeriodStart: new Date(1000 * 1000),
        currentPeriodEnd: new Date(2000 * 1000),
        trialEndsAt: null,
        canceledAt: null,
      }),
      expect.any(Object),
    );
    expect(eventBusMock.publish).toHaveBeenCalledWith(expect.any(SubscriptionRenewedEvent));
  });

  it('should fall back to subscription.metadata.barId when no local record exists yet', async () => {
    const subscription = {
      id: 'sub_123',
      customer: 'cus_123',
      metadata: { barId: 'bar_123' },
      status: 'trialing',
      cancel_at: null,
      cancel_at_period_end: false,
      canceled_at: null,
      trial_end: 5000,
      items: { data: [{ current_period_start: 1000, current_period_end: 2000, price: { id: 'price_pro' } }] },
    } as any;
    readRepoMock.findByStripeSubscriptionId.mockResolvedValue(null);
    readRepoMock.findByStripeCustomerId.mockResolvedValue(null);

    await handler.execute(new HandleSubscriptionChangedCommand(subscription));

    expect(writeRepoMock.upsert).toHaveBeenCalledWith(
      'bar_123',
      expect.objectContaining({ status: 'TRIALING', trialEndsAt: new Date(5000 * 1000) }),
      expect.any(Object),
    );
  });

  it('should set status CANCELED, plan FREE and clear the stripeSubscriptionId for terminal cancellation', async () => {
    const subscription = {
      id: 'sub_123',
      customer: 'cus_123',
      status: 'canceled',
      cancel_at: null,
      cancel_at_period_end: false,
      canceled_at: 1500,
      trial_end: null,
      items: { data: [] },
    } as any;
    readRepoMock.findByStripeSubscriptionId.mockResolvedValue({ barId: 'bar_123' });

    await handler.execute(new HandleSubscriptionChangedCommand(subscription));

    expect(writeRepoMock.upsert).toHaveBeenCalledWith(
      'bar_123',
      expect.objectContaining({
        plan: 'FREE',
        status: 'CANCELED',
        stripeSubscriptionId: null,
        canceledAt: new Date(1500 * 1000),
      }),
      expect.any(Object),
    );
    expect(eventBusMock.publish).toHaveBeenCalledWith(expect.any(SubscriptionCancelledEvent));
    expect(eventBusMock.publish).not.toHaveBeenCalledWith(expect.any(SubscriptionRenewedEvent));
  });

  it('should set status CANCELED but keep the subscriptionId for a scheduled (not yet effective) cancellation', async () => {
    const subscription = {
      id: 'sub_123',
      customer: 'cus_123',
      status: 'active',
      cancel_at: 3000,
      cancel_at_period_end: true,
      canceled_at: 1500,
      trial_end: null,
      items: { data: [{ current_period_start: 1000, current_period_end: 2000, price: { id: 'price_pro' } }] },
    } as any;
    readRepoMock.findByStripeSubscriptionId.mockResolvedValue({ barId: 'bar_123' });

    await handler.execute(new HandleSubscriptionChangedCommand(subscription));

    expect(writeRepoMock.upsert).toHaveBeenCalledWith(
      'bar_123',
      expect.objectContaining({
        status: 'CANCELED',
        stripeSubscriptionId: 'sub_123',
        currentPeriodEnd: new Date(3000 * 1000),
      }),
      expect.any(Object),
    );
  });
});
