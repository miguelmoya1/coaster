import { ErrorCodes } from '@coaster/common';
import { InternalServerErrorException } from '@nestjs/common';
import Stripe from 'stripe';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { HandleCheckoutCompletedCommand } from '../impl/handle-checkout-completed.command';
import { HandleCheckoutCompletedHandler } from './handle-checkout-completed.handler';

describe('HandleCheckoutCompletedHandler (bar-subscription)', () => {
  let handler: HandleCheckoutCompletedHandler;
  let writeRepoMock: any;

  beforeEach(() => {
    writeRepoMock = {
      upsert: vi.fn(),
    };

    handler = new HandleCheckoutCompletedHandler(writeRepoMock);
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
