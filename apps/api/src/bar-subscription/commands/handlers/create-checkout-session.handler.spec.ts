import type { BarId } from '@coaster/common';
import { ErrorCodes, SubscriptionPlan } from '@coaster/common';
import { InternalServerErrorException } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CreateCheckoutSessionCommand } from '../impl/create-checkout-session.command';
import { CreateCheckoutSessionHandler } from './create-checkout-session.handler';

describe('CreateCheckoutSessionHandler (bar-subscription)', () => {
  let handler: CreateCheckoutSessionHandler;
  let stripeClientMock: any;
  let configServiceMock: any;
  let readRepoMock: any;

  beforeEach(() => {
    stripeClientMock = {
      client: {
        subscriptions: {
          retrieve: vi.fn(),
        },
        checkout: {
          sessions: {
            create: vi.fn(),
          },
        },
      },
    };

    configServiceMock = {
      get: vi.fn().mockImplementation((key: string) => {
        if (key === 'STRIPE_PRICE_PRO') return 'price_monthly';
        return undefined;
      }),
    };

    readRepoMock = {
      findByBarId: vi.fn(),
    };

    handler = new CreateCheckoutSessionHandler(stripeClientMock, configServiceMock, readRepoMock as any);
  });

  it('should reuse existing stripeCustomerId and create checkout session', async () => {
    const barId = 'bar_123' as BarId;
    readRepoMock.findByBarId.mockResolvedValue({ stripeCustomerId: 'cus_existing' });
    stripeClientMock.client.checkout.sessions.create.mockResolvedValue({
      id: 'cs_123',
      url: 'https://checkout.stripe.com/pay',
    });

    const command = new CreateCheckoutSessionCommand(barId, SubscriptionPlan.PRO);

    const result = await handler.execute(command);

    expect(stripeClientMock.client.checkout.sessions.create).toHaveBeenCalledWith(
      expect.objectContaining({ customer: 'cus_existing' }),
    );
    expect(result).toEqual({ id: 'cs_123', url: 'https://checkout.stripe.com/pay' });
  });

  it('should let Stripe create the customer if no stripeCustomerId exists', async () => {
    const barId = 'bar_123' as BarId;
    readRepoMock.findByBarId.mockResolvedValue(null);
    stripeClientMock.client.checkout.sessions.create.mockResolvedValue({
      id: 'cs_123',
      url: 'https://checkout.stripe.com/pay',
    });

    const command = new CreateCheckoutSessionCommand(barId, SubscriptionPlan.PRO);

    const result = await handler.execute(command);

    expect(stripeClientMock.client.checkout.sessions.create).toHaveBeenCalledWith(
      expect.not.objectContaining({ customer: expect.anything() }),
    );
    expect(result).toEqual({ id: 'cs_123', url: 'https://checkout.stripe.com/pay' });
  });

  it('should throw InternalServerErrorException if session url is missing', async () => {
    const barId = 'bar_123' as BarId;
    readRepoMock.findByBarId.mockResolvedValue({ stripeCustomerId: 'cus_existing' });

    stripeClientMock.client.checkout.sessions.create.mockResolvedValue({ id: 'cs_123', url: null });

    const command = new CreateCheckoutSessionCommand(barId, SubscriptionPlan.PRO);

    await expect(handler.execute(command)).rejects.toThrow(
      new InternalServerErrorException(ErrorCodes.STRIPE_CHECKOUT_SESSION_FAILED),
    );
  });

  it('should recover from a stale subscription reference without writing the database', async () => {
    const barId = 'bar_123' as BarId;
    readRepoMock.findByBarId.mockResolvedValue({
      stripeCustomerId: null,
      stripeSubscriptionId: 'sub_stale',
      status: 'ACTIVE',
    });
    stripeClientMock.client.subscriptions.retrieve.mockRejectedValue({
      code: 'resource_missing',
      message: 'No such subscription: sub_stale',
    });
    stripeClientMock.client.checkout.sessions.create.mockResolvedValue({
      id: 'cs_recovery',
      url: 'https://checkout.stripe.com/recovery',
    });

    const result = await handler.execute(new CreateCheckoutSessionCommand(barId, SubscriptionPlan.PRO));

    expect(result.url).toBe('https://checkout.stripe.com/recovery');
    expect(stripeClientMock.client.checkout.sessions.create).toHaveBeenCalledWith(
      expect.not.objectContaining({ customer: expect.anything() }),
    );
  });

  it('should retry checkout without a stale customer reference', async () => {
    const barId = 'bar_123' as BarId;
    readRepoMock.findByBarId.mockResolvedValue({ stripeCustomerId: 'cus_stale' });
    stripeClientMock.client.checkout.sessions.create
      .mockRejectedValueOnce({ code: 'resource_missing', param: 'customer', message: 'No such customer: cus_stale' })
      .mockResolvedValueOnce({ id: 'cs_recovery', url: 'https://checkout.stripe.com/recovery' });

    await handler.execute(new CreateCheckoutSessionCommand(barId, SubscriptionPlan.PRO));

    expect(stripeClientMock.client.checkout.sessions.create).toHaveBeenCalledTimes(2);
    expect(stripeClientMock.client.checkout.sessions.create.mock.calls[1][0]).not.toHaveProperty('customer');
  });
});
