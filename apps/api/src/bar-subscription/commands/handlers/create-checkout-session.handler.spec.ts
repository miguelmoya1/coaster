import type { BarId } from '@coaster/common';
import { ErrorCodes, SubscriptionPlan } from '@coaster/common';
import { BadRequestException, InternalServerErrorException } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CreateCheckoutSessionCommand } from '../impl/create-checkout-session.command';
import { CreateCheckoutSessionHandler } from './create-checkout-session.handler';

describe('CreateCheckoutSessionHandler (bar-subscription)', () => {
  let handler: CreateCheckoutSessionHandler;
  let stripeApiMock: any;
  let configServiceMock: any;
  let readRepoMock: any;

  const barId = 'bar_123' as BarId;

  beforeEach(() => {
    stripeApiMock = {
      createCheckoutSession: vi.fn().mockResolvedValue({ id: 'cs_123', url: 'https://checkout.stripe.com/pay' }),
      retrieveSubscription: vi.fn().mockResolvedValue(null),
    };

    configServiceMock = {
      get: vi.fn().mockImplementation((key: string) => (key === 'STRIPE_PRICE_PRO' ? 'price_monthly' : undefined)),
    };

    readRepoMock = {
      findByBarId: vi.fn(),
    };

    handler = new CreateCheckoutSessionHandler(stripeApiMock, configServiceMock, readRepoMock);
  });

  it('should reuse existing stripeCustomerId and create checkout session', async () => {
    readRepoMock.findByBarId.mockResolvedValue({ stripeCustomerId: 'cus_existing' });

    const result = await handler.execute(new CreateCheckoutSessionCommand(barId, SubscriptionPlan.PRO));

    expect(stripeApiMock.createCheckoutSession).toHaveBeenCalledWith(
      expect.objectContaining({
        mode: 'subscription',
        client_reference_id: barId,
        line_items: [{ price: 'price_monthly', quantity: 1 }],
      }),
      'cus_existing',
    );
    expect(result).toEqual({ id: 'cs_123', url: 'https://checkout.stripe.com/pay' });
  });

  it('should let Stripe create the customer if no stripeCustomerId exists', async () => {
    readRepoMock.findByBarId.mockResolvedValue(null);

    const result = await handler.execute(new CreateCheckoutSessionCommand(barId, SubscriptionPlan.PRO));

    expect(stripeApiMock.createCheckoutSession).toHaveBeenCalledWith(expect.any(Object), undefined);
    expect(result).toEqual({ id: 'cs_123', url: 'https://checkout.stripe.com/pay' });
  });

  it('should carry the barId in metadata so webhooks can resolve the bar', async () => {
    readRepoMock.findByBarId.mockResolvedValue(null);

    await handler.execute(new CreateCheckoutSessionCommand(barId, SubscriptionPlan.PRO));

    const [params] = stripeApiMock.createCheckoutSession.mock.calls[0];
    expect(params.metadata).toEqual({ barId, plan: SubscriptionPlan.PRO });
    expect(params.subscription_data.metadata).toEqual({ barId, plan: SubscriptionPlan.PRO });
  });

  it('should throw InternalServerErrorException if session url is missing', async () => {
    readRepoMock.findByBarId.mockResolvedValue({ stripeCustomerId: 'cus_existing' });
    stripeApiMock.createCheckoutSession.mockResolvedValue({ id: 'cs_123', url: null });

    await expect(handler.execute(new CreateCheckoutSessionCommand(barId, SubscriptionPlan.PRO))).rejects.toThrow(
      new InternalServerErrorException(ErrorCodes.STRIPE_CHECKOUT_SESSION_FAILED),
    );
  });

  it('should reject when the bar already has a live Stripe subscription', async () => {
    readRepoMock.findByBarId.mockResolvedValue({
      stripeCustomerId: 'cus_1',
      stripeSubscriptionId: 'sub_live',
      status: 'ACTIVE',
    });
    stripeApiMock.retrieveSubscription.mockResolvedValue({ id: 'sub_live' });

    await expect(handler.execute(new CreateCheckoutSessionCommand(barId, SubscriptionPlan.PRO))).rejects.toThrow(
      new BadRequestException(ErrorCodes.STRIPE_SUBSCRIPTION_ALREADY_EXISTS),
    );
    expect(stripeApiMock.createCheckoutSession).not.toHaveBeenCalled();
  });

  it('should reject while a cancellation is still pending', async () => {
    readRepoMock.findByBarId.mockResolvedValue({
      stripeCustomerId: 'cus_1',
      stripeSubscriptionId: 'sub_live',
      status: 'CANCELED',
      currentPeriodEnd: new Date(Date.now() + 86_400_000),
    });
    stripeApiMock.retrieveSubscription.mockResolvedValue({ id: 'sub_live' });

    await expect(handler.execute(new CreateCheckoutSessionCommand(barId, SubscriptionPlan.PRO))).rejects.toThrow(
      new BadRequestException(ErrorCodes.STRIPE_SUBSCRIPTION_PENDING_CANCELLATION),
    );
  });

  it('should recover from a stale subscription reference without writing the database', async () => {
    readRepoMock.findByBarId.mockResolvedValue({
      stripeCustomerId: null,
      stripeSubscriptionId: 'sub_stale',
      status: 'ACTIVE',
    });
    stripeApiMock.retrieveSubscription.mockResolvedValue(null);
    stripeApiMock.createCheckoutSession.mockResolvedValue({
      id: 'cs_recovery',
      url: 'https://checkout.stripe.com/recovery',
    });

    const result = await handler.execute(new CreateCheckoutSessionCommand(barId, SubscriptionPlan.PRO));

    expect(result.url).toBe('https://checkout.stripe.com/recovery');
    expect(stripeApiMock.createCheckoutSession).toHaveBeenCalledWith(expect.any(Object), null);
  });
});
