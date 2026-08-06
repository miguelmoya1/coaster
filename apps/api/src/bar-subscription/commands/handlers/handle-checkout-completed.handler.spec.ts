import { ErrorCodes } from '@coaster/common';
import { InternalServerErrorException } from '@nestjs/common';
import Stripe from 'stripe';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { HandleCheckoutCompletedCommand } from '../impl/handle-checkout-completed.command';
import { HandleCheckoutCompletedHandler } from './handle-checkout-completed.handler';

describe('HandleCheckoutCompletedHandler (bar-subscription)', () => {
  let handler: HandleCheckoutCompletedHandler;
  let writeRepoMock: any;
  let readRepoMock: any;
  let stripeApiMock: any;
  let eventBusMock: any;

  beforeEach(() => {
    writeRepoMock = {
      upsert: vi.fn(),
    };
    readRepoMock = {
      findByBarId: vi.fn().mockResolvedValue(null),
    };
    stripeApiMock = {
      retrieveSubscription: vi.fn(),
      cancelSubscription: vi.fn().mockResolvedValue(true),
    };
    eventBusMock = {
      publish: vi.fn(),
    };

    handler = new HandleCheckoutCompletedHandler(writeRepoMock, readRepoMock, stripeApiMock, eventBusMock);
  });

  describe('duplicate subscriptions', () => {
    const duplicateSession = {
      id: 'cs_2',
      mode: 'subscription',
      customer: 'cus_123',
      subscription: 'sub_duplicate',
      metadata: { barId: 'bar-1' },
    } as unknown as Stripe.Checkout.Session;

    it('should cancel a second subscription instead of overwriting the live one', async () => {
      readRepoMock.findByBarId.mockResolvedValue({ stripeSubscriptionId: 'sub_original' });
      stripeApiMock.retrieveSubscription.mockResolvedValue({ id: 'sub_original', status: 'active' });

      await handler.execute(new HandleCheckoutCompletedCommand(duplicateSession));

      expect(stripeApiMock.cancelSubscription).toHaveBeenCalledWith('sub_duplicate');
      expect(writeRepoMock.upsert).not.toHaveBeenCalled();
      expect(eventBusMock.publish).toHaveBeenCalledWith(
        expect.objectContaining({
          barId: 'bar-1',
          keptSubscriptionId: 'sub_original',
          cancelledSubscriptionId: 'sub_duplicate',
        }),
      );
    });

    it('should accept a repurchase once the tracked subscription is dead in Stripe', async () => {
      readRepoMock.findByBarId.mockResolvedValue({ stripeSubscriptionId: 'sub_original' });
      stripeApiMock.retrieveSubscription.mockResolvedValue({ id: 'sub_original', status: 'canceled' });

      await handler.execute(new HandleCheckoutCompletedCommand(duplicateSession));

      expect(stripeApiMock.cancelSubscription).not.toHaveBeenCalled();
      expect(writeRepoMock.upsert).toHaveBeenCalled();
    });

    it('should accept a repurchase when Stripe no longer knows the tracked subscription', async () => {
      readRepoMock.findByBarId.mockResolvedValue({ stripeSubscriptionId: 'sub_gone' });
      stripeApiMock.retrieveSubscription.mockResolvedValue(null);

      await handler.execute(new HandleCheckoutCompletedCommand(duplicateSession));

      expect(stripeApiMock.cancelSubscription).not.toHaveBeenCalled();
      expect(writeRepoMock.upsert).toHaveBeenCalled();
    });

    it('should stay idempotent when the same webhook is delivered twice', async () => {
      readRepoMock.findByBarId.mockResolvedValue({ stripeSubscriptionId: 'sub_duplicate' });

      await handler.execute(new HandleCheckoutCompletedCommand(duplicateSession));

      expect(stripeApiMock.cancelSubscription).not.toHaveBeenCalled();
      expect(stripeApiMock.retrieveSubscription).not.toHaveBeenCalled();
      expect(writeRepoMock.upsert).toHaveBeenCalled();
    });
  });

  it('should ignore checkout sessions that are not for a subscription', async () => {
    const session = { id: 'cs_1', mode: 'payment' } as Stripe.Checkout.Session;

    await handler.execute(new HandleCheckoutCompletedCommand(session));

    expect(writeRepoMock.upsert).not.toHaveBeenCalled();
  });

  it('should fail if barId is missing', async () => {
    const session = {
      id: 'cs_1',
      mode: 'subscription',
      customer: 'cus_123',
      subscription: 'sub_123',
      metadata: {},
    } as unknown as Stripe.Checkout.Session;

    await expect(handler.execute(new HandleCheckoutCompletedCommand(session))).rejects.toEqual(
      new InternalServerErrorException(ErrorCodes.STRIPE_WEBHOOK_BAR_ID_MISSING),
    );
    expect(writeRepoMock.upsert).not.toHaveBeenCalled();
  });

  it('should fail if customerId is missing', async () => {
    const session = {
      id: 'cs_1',
      mode: 'subscription',
      client_reference_id: 'bar_123',
      subscription: 'sub_123',
      customer: null,
    } as unknown as Stripe.Checkout.Session;

    await expect(handler.execute(new HandleCheckoutCompletedCommand(session))).rejects.toEqual(
      new InternalServerErrorException(ErrorCodes.STRIPE_WEBHOOK_CUSTOMER_MISSING),
    );
    expect(writeRepoMock.upsert).not.toHaveBeenCalled();
  });

  it('should fail if subscriptionId is missing', async () => {
    const session = {
      id: 'cs_1',
      mode: 'subscription',
      client_reference_id: 'bar_123',
      customer: 'cus_123',
      subscription: null,
    } as unknown as Stripe.Checkout.Session;

    await expect(handler.execute(new HandleCheckoutCompletedCommand(session))).rejects.toEqual(
      new InternalServerErrorException(ErrorCodes.STRIPE_WEBHOOK_SUBSCRIPTION_MISSING),
    );
    expect(writeRepoMock.upsert).not.toHaveBeenCalled();
  });

  it('should link Stripe references for the resolved barId', async () => {
    const session = {
      id: 'cs_1',
      mode: 'subscription',
      metadata: { barId: 'bar_123' },
      customer: 'cus_123',
      subscription: 'sub_123',
    } as unknown as Stripe.Checkout.Session;

    await handler.execute(new HandleCheckoutCompletedCommand(session));

    expect(writeRepoMock.upsert).toHaveBeenCalledWith(
      'bar_123',
      expect.objectContaining({
        status: 'INACTIVE',
        stripeCustomerId: 'cus_123',
        stripeSubscriptionId: 'sub_123',
      }),
      { stripeCustomerId: 'cus_123', stripeSubscriptionId: 'sub_123' },
    );
  });

  it('should fall back to client_reference_id when metadata.barId is absent', async () => {
    const session = {
      id: 'cs_1',
      mode: 'subscription',
      client_reference_id: 'bar_456',
      customer: { id: 'cus_123' },
      subscription: { id: 'sub_123' },
    } as unknown as Stripe.Checkout.Session;

    await handler.execute(new HandleCheckoutCompletedCommand(session));

    expect(writeRepoMock.upsert).toHaveBeenCalledWith(
      'bar_456',
      expect.objectContaining({ stripeCustomerId: 'cus_123', stripeSubscriptionId: 'sub_123' }),
      { stripeCustomerId: 'cus_123', stripeSubscriptionId: 'sub_123' },
    );
  });
});
