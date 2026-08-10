import { ErrorCodes } from '@coaster/common';
import { InternalServerErrorException } from '@nestjs/common';
import Stripe from 'stripe';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { HandleCheckoutCompletedCommand } from '../impl/handle-checkout-completed.command';
import { HandleCheckoutCompletedHandler } from './handle-checkout-completed.handler';

describe('HandleCheckoutCompletedHandler (establishment-subscription)', () => {
  let handler: HandleCheckoutCompletedHandler;
  let writeRepoMock: any;
  let readRepoMock: any;
  let stripeApiMock: any;
  let eventBusMock: any;
  let configServiceMock: any;

  beforeEach(() => {
    writeRepoMock = {
      upsert: vi.fn(),
    };
    readRepoMock = {
      findByEstablishmentId: vi.fn().mockResolvedValue(null),
    };
    stripeApiMock = {
      retrieveSubscription: vi.fn(),
      cancelSubscription: vi.fn().mockResolvedValue(true),
    };
    eventBusMock = {
      publish: vi.fn(),
    };

    configServiceMock = {
      get: vi.fn().mockImplementation((key: string) => (key === 'STRIPE_PRICE_PRO' ? 'price_pro' : undefined)),
    };

    handler = new HandleCheckoutCompletedHandler(
      writeRepoMock,
      readRepoMock,
      stripeApiMock,
      eventBusMock,
      configServiceMock,
    );
  });

  describe('duplicate subscriptions', () => {
    const duplicateSession = {
      id: 'cs_2',
      mode: 'subscription',
      customer: 'cus_123',
      subscription: 'sub_duplicate',
      metadata: { establishmentId: 'establishment-1' },
    } as unknown as Stripe.Checkout.Session;

    it('should cancel a second subscription instead of overwriting the live one', async () => {
      readRepoMock.findByEstablishmentId.mockResolvedValue({ stripeSubscriptionId: 'sub_original' });
      stripeApiMock.retrieveSubscription.mockResolvedValue({ id: 'sub_original', status: 'active' });

      await handler.execute(new HandleCheckoutCompletedCommand(duplicateSession));

      expect(stripeApiMock.cancelSubscription).toHaveBeenCalledWith('sub_duplicate');
      expect(writeRepoMock.upsert).not.toHaveBeenCalled();
      expect(eventBusMock.publish).toHaveBeenCalledWith(
        expect.objectContaining({
          establishmentId: 'establishment-1',
          keptSubscriptionId: 'sub_original',
          cancelledSubscriptionId: 'sub_duplicate',
        }),
      );
    });

    it('should accept a repurchase once the tracked subscription is dead in Stripe', async () => {
      readRepoMock.findByEstablishmentId.mockResolvedValue({ stripeSubscriptionId: 'sub_original' });
      stripeApiMock.retrieveSubscription.mockResolvedValue({ id: 'sub_original', status: 'canceled' });

      await handler.execute(new HandleCheckoutCompletedCommand(duplicateSession));

      expect(stripeApiMock.cancelSubscription).not.toHaveBeenCalled();
      expect(writeRepoMock.upsert).toHaveBeenCalled();
    });

    it('should accept a repurchase when Stripe no longer knows the tracked subscription', async () => {
      readRepoMock.findByEstablishmentId.mockResolvedValue({ stripeSubscriptionId: 'sub_gone' });
      stripeApiMock.retrieveSubscription.mockResolvedValue(null);

      await handler.execute(new HandleCheckoutCompletedCommand(duplicateSession));

      expect(stripeApiMock.cancelSubscription).not.toHaveBeenCalled();
      expect(writeRepoMock.upsert).toHaveBeenCalled();
    });

    it('should stay idempotent when the same webhook is delivered twice', async () => {
      readRepoMock.findByEstablishmentId.mockResolvedValue({ stripeSubscriptionId: 'sub_duplicate' });
      stripeApiMock.retrieveSubscription.mockResolvedValue({
        id: 'sub_duplicate',
        status: 'active',
        items: { data: [{ price: { id: 'price_pro' } }] },
      });

      await handler.execute(new HandleCheckoutCompletedCommand(duplicateSession));
      await handler.execute(new HandleCheckoutCompletedCommand(duplicateSession));

      // The establishment keeps the subscription it already tracks; a redelivery just rewrites the same state.
      expect(stripeApiMock.cancelSubscription).not.toHaveBeenCalled();
      expect(writeRepoMock.upsert).toHaveBeenCalledTimes(2);
      expect(writeRepoMock.upsert.mock.calls[0]).toEqual(writeRepoMock.upsert.mock.calls[1]);
    });
  });

  it('should ignore checkout sessions that are not for a subscription', async () => {
    const session = { id: 'cs_1', mode: 'payment' } as Stripe.Checkout.Session;

    await handler.execute(new HandleCheckoutCompletedCommand(session));

    expect(writeRepoMock.upsert).not.toHaveBeenCalled();
  });

  it('should fail if establishmentId is missing', async () => {
    const session = {
      id: 'cs_1',
      mode: 'subscription',
      customer: 'cus_123',
      subscription: 'sub_123',
      metadata: {},
    } as unknown as Stripe.Checkout.Session;

    await expect(handler.execute(new HandleCheckoutCompletedCommand(session))).rejects.toEqual(
      new InternalServerErrorException(ErrorCodes.STRIPE_WEBHOOK_ESTABLISHMENT_ID_MISSING),
    );
    expect(writeRepoMock.upsert).not.toHaveBeenCalled();
  });

  it('should fail if customerId is missing', async () => {
    const session = {
      id: 'cs_1',
      mode: 'subscription',
      client_reference_id: 'establishment_123',
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
      client_reference_id: 'establishment_123',
      customer: 'cus_123',
      subscription: null,
    } as unknown as Stripe.Checkout.Session;

    await expect(handler.execute(new HandleCheckoutCompletedCommand(session))).rejects.toEqual(
      new InternalServerErrorException(ErrorCodes.STRIPE_WEBHOOK_SUBSCRIPTION_MISSING),
    );
    expect(writeRepoMock.upsert).not.toHaveBeenCalled();
  });

  it('should link the references as inactive while Stripe still does not know the subscription', async () => {
    const session = {
      id: 'cs_1',
      mode: 'subscription',
      metadata: { establishmentId: 'establishment_123' },
      customer: 'cus_123',
      subscription: 'sub_123',
    } as unknown as Stripe.Checkout.Session;
    stripeApiMock.retrieveSubscription.mockResolvedValue(null);

    await handler.execute(new HandleCheckoutCompletedCommand(session));

    expect(writeRepoMock.upsert).toHaveBeenCalledWith(
      'establishment_123',
      expect.objectContaining({
        status: 'INACTIVE',
        stripeCustomerId: 'cus_123',
        stripeSubscriptionId: 'sub_123',
      }),
      expect.objectContaining({ status: 'INACTIVE', stripeSubscriptionId: 'sub_123' }),
    );
  });

  it('should write the state read back from Stripe instead of waiting for customer.subscription.*', async () => {
    const session = {
      id: 'cs_1',
      mode: 'subscription',
      metadata: { establishmentId: 'establishment_123' },
      customer: 'cus_123',
      subscription: 'sub_123',
    } as unknown as Stripe.Checkout.Session;
    const periodEnd = Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60;
    stripeApiMock.retrieveSubscription.mockResolvedValue({
      id: 'sub_123',
      status: 'active',
      items: { data: [{ price: { id: 'price_pro' }, current_period_end: periodEnd }] },
    });

    await handler.execute(new HandleCheckoutCompletedCommand(session));

    const [, create, update] = writeRepoMock.upsert.mock.calls.at(-1);

    expect(create).toMatchObject({
      plan: 'PRO',
      status: 'ACTIVE',
      stripeCustomerId: 'cus_123',
      stripeSubscriptionId: 'sub_123',
      currentPeriodEnd: new Date(periodEnd * 1000),
    });
    expect(update).toEqual(create);
  });

  it('should fall back to client_reference_id when metadata.establishmentId is absent', async () => {
    const session = {
      id: 'cs_1',
      mode: 'subscription',
      client_reference_id: 'establishment_456',
      customer: { id: 'cus_123' },
      subscription: { id: 'sub_123' },
    } as unknown as Stripe.Checkout.Session;
    stripeApiMock.retrieveSubscription.mockResolvedValue(null);

    await handler.execute(new HandleCheckoutCompletedCommand(session));

    expect(writeRepoMock.upsert).toHaveBeenCalledWith(
      'establishment_456',
      expect.objectContaining({ stripeCustomerId: 'cus_123', stripeSubscriptionId: 'sub_123' }),
      expect.objectContaining({ stripeCustomerId: 'cus_123', stripeSubscriptionId: 'sub_123' }),
    );
  });
});
