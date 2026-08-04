import { ErrorCodes } from '@coaster/common';
import { InternalServerErrorException } from '@nestjs/common';
import Stripe from 'stripe';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { HandleCheckoutCompletedCommand } from '../impl/handle-checkout-completed.command';
import { HandleCheckoutCompletedHandler } from './handle-checkout-completed.handler';

describe('HandleCheckoutCompletedHandler', () => {
  let handler: HandleCheckoutCompletedHandler;
  let writeRepoMock: any;

  beforeEach(() => {
    writeRepoMock = {
      linkStripeReferences: vi.fn(),
    };
    handler = new HandleCheckoutCompletedHandler(writeRepoMock as any);
  });

  it('should ignore sessions with mode !== subscription', async () => {
    const session = { mode: 'payment' } as Stripe.Checkout.Session;
    await handler.execute(new HandleCheckoutCompletedCommand(session));

    expect(writeRepoMock.linkStripeReferences).not.toHaveBeenCalled();
  });

  it('should fail and leave the event retryable when barId is missing', async () => {
    const session = { mode: 'subscription', customer: 'cus_123' } as Stripe.Checkout.Session;
    await expect(handler.execute(new HandleCheckoutCompletedCommand(session))).rejects.toEqual(
      new InternalServerErrorException(ErrorCodes.STRIPE_WEBHOOK_BAR_ID_MISSING),
    );

    expect(writeRepoMock.linkStripeReferences).not.toHaveBeenCalled();
  });

  it('should fail and leave the event retryable when customerId is missing', async () => {
    const session = { mode: 'subscription', metadata: { barId: 'bar_123' } } as Stripe.Checkout.Session;
    await expect(handler.execute(new HandleCheckoutCompletedCommand(session))).rejects.toEqual(
      new InternalServerErrorException(ErrorCodes.STRIPE_WEBHOOK_CUSTOMER_MISSING),
    );

    expect(writeRepoMock.linkStripeReferences).not.toHaveBeenCalled();
  });

  it('should fail and leave the event retryable when subscriptionId is missing', async () => {
    const session = {
      mode: 'subscription',
      metadata: { barId: 'bar_123' },
      customer: 'cus_123',
    } as Stripe.Checkout.Session;
    await expect(handler.execute(new HandleCheckoutCompletedCommand(session))).rejects.toEqual(
      new InternalServerErrorException(ErrorCodes.STRIPE_WEBHOOK_SUBSCRIPTION_MISSING),
    );

    expect(writeRepoMock.linkStripeReferences).not.toHaveBeenCalled();
  });

  it('should upsert customer and subscription ID when session is valid', async () => {
    const session = {
      mode: 'subscription',
      metadata: { barId: 'bar_123' },
      customer: 'cus_123',
      subscription: 'sub_123',
    } as any;

    await handler.execute(new HandleCheckoutCompletedCommand(session));

    expect(writeRepoMock.linkStripeReferences).toHaveBeenCalledWith('bar_123', 'cus_123', 'sub_123');
  });
});
