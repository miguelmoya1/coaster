import { BarId, SubscriptionPlan } from '@coaster/common';
import { InternalServerErrorException } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CreateCheckoutSessionCommand } from '../impl/create-checkout-session.command';
import { CreateCheckoutSessionHandler } from './create-checkout-session.handler';

describe('CreateCheckoutSessionHandler', () => {
  let handler: CreateCheckoutSessionHandler;
  let stripeClientMock: any;
  let configServiceMock: any;
  let readRepoMock: any;
  let writeRepoMock: any;

  beforeEach(() => {
    stripeClientMock = {
      client: {
        customers: {
          update: vi.fn(),
          create: vi.fn(),
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
        if (key === 'STRIPE_PRICE_PRO_MONTHLY') return 'price_monthly';
        return undefined;
      }),
    };

    readRepoMock = {
      findSubscriptionByBarId: vi.fn(),
      findBarById: vi.fn(),
    };

    writeRepoMock = {
      upsertBarCustomerId: vi.fn(),
    };

    handler = new CreateCheckoutSessionHandler(
      stripeClientMock,
      configServiceMock,
      readRepoMock as any,
      writeRepoMock as any,
    );
  });

  it('should reuse existing stripeCustomerId and create checkout session', async () => {
    const barId = 'bar_123' as BarId;
    readRepoMock.findSubscriptionByBarId.mockResolvedValue({ stripeCustomerId: 'cus_existing' });
    readRepoMock.findBarById.mockResolvedValue({ id: barId, name: 'Cool Bar' });

    stripeClientMock.client.checkout.sessions.create.mockResolvedValue({
      id: 'cs_123',
      url: 'https://checkout.stripe.com/pay',
    });

    const command = new CreateCheckoutSessionCommand(
      barId,
      SubscriptionPlan.PRO_MONTHLY,
      'https://success',
      'https://cancel',
    );

    const result = await handler.execute(command);

    expect(stripeClientMock.client.customers.update).toHaveBeenCalledWith('cus_existing', { name: 'Cool Bar' });
    expect(result).toEqual({ id: 'cs_123', url: 'https://checkout.stripe.com/pay' });
  });

  it('should create new customer if no stripeCustomerId exists', async () => {
    const barId = 'bar_123' as BarId;
    readRepoMock.findSubscriptionByBarId.mockResolvedValue(null);
    readRepoMock.findBarById.mockResolvedValue(null);
    stripeClientMock.client.customers.create.mockResolvedValue({ id: 'cus_new' });

    stripeClientMock.client.checkout.sessions.create.mockResolvedValue({
      id: 'cs_123',
      url: 'https://checkout.stripe.com/pay',
    });

    const command = new CreateCheckoutSessionCommand(
      barId,
      SubscriptionPlan.PRO_MONTHLY,
      'https://success',
      'https://cancel',
    );

    const result = await handler.execute(command);

    expect(stripeClientMock.client.customers.create).toHaveBeenCalledWith({
      metadata: { barId },
      name: 'Bar bar_123',
    });
    expect(writeRepoMock.upsertBarCustomerId).toHaveBeenCalledWith(barId, 'cus_new');
    expect(result).toEqual({ id: 'cs_123', url: 'https://checkout.stripe.com/pay' });
  });

  it('should throw InternalServerErrorException if session url is missing', async () => {
    const barId = 'bar_123' as BarId;
    readRepoMock.findSubscriptionByBarId.mockResolvedValue({ stripeCustomerId: 'cus_existing' });

    stripeClientMock.client.checkout.sessions.create.mockResolvedValue({ id: 'cs_123', url: null });

    const command = new CreateCheckoutSessionCommand(
      barId,
      SubscriptionPlan.PRO_MONTHLY,
      'https://success',
      'https://cancel',
    );

    await expect(handler.execute(command)).rejects.toThrow(InternalServerErrorException);
  });
});
