import type { BarId } from '@coaster/common';
import { ErrorCodes } from '@coaster/common';
import { BadRequestException, InternalServerErrorException } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CreateCustomerPortalSessionCommand } from '../impl/create-customer-portal-session.command';
import { CreateCustomerPortalSessionHandler } from './create-customer-portal-session.handler';

describe('CreateCustomerPortalSessionHandler (bar-subscription)', () => {
  let handler: CreateCustomerPortalSessionHandler;
  let stripeClientMock: any;
  let readRepoMock: any;
  let configServiceMock: any;

  beforeEach(() => {
    stripeClientMock = {
      client: {
        billingPortal: {
          sessions: {
            create: vi.fn(),
          },
        },
        subscriptions: {
          retrieve: vi.fn(),
        },
      },
    };

    readRepoMock = {
      findByBarId: vi.fn(),
    };
    configServiceMock = {
      get: vi.fn().mockReturnValue('https://app.example.com'),
    };

    handler = new CreateCustomerPortalSessionHandler(stripeClientMock, readRepoMock as any, configServiceMock);
  });

  it('should throw BadRequestException if no subscription or stripeCustomerId exists', async () => {
    const barId = 'bar_123' as BarId;
    readRepoMock.findByBarId.mockResolvedValue(null);

    const command = new CreateCustomerPortalSessionCommand(barId);

    await expect(handler.execute(command)).rejects.toThrow(
      new BadRequestException(ErrorCodes.STRIPE_CUSTOMER_NOT_FOUND),
    );
  });

  it('should create billing portal session when stripeCustomerId exists', async () => {
    const barId = 'bar_123' as BarId;
    readRepoMock.findByBarId.mockResolvedValue({ stripeCustomerId: 'cus_123' });
    stripeClientMock.client.billingPortal.sessions.create.mockResolvedValue({ url: 'https://portal.stripe.com' });

    const command = new CreateCustomerPortalSessionCommand(barId);

    const result = await handler.execute(command);

    expect(stripeClientMock.client.billingPortal.sessions.create).toHaveBeenCalledWith({
      customer: 'cus_123',
      return_url: 'https://app.example.com/bars/bar_123/dashboard',
    });
    expect(result).toEqual({ url: 'https://portal.stripe.com' });
  });

  it('should recover the customer from the remote subscription when the local customer is stale', async () => {
    const barId = 'bar_123' as BarId;
    readRepoMock.findByBarId.mockResolvedValue({
      stripeCustomerId: 'cus_stale',
      stripeSubscriptionId: 'sub_123',
    });
    stripeClientMock.client.billingPortal.sessions.create
      .mockRejectedValueOnce({ code: 'resource_missing', param: 'customer', message: 'No such customer: cus_stale' })
      .mockResolvedValueOnce({ url: 'https://portal.stripe.com/recovered' });
    stripeClientMock.client.subscriptions.retrieve.mockResolvedValue({ customer: 'cus_remote' });

    const result = await handler.execute(new CreateCustomerPortalSessionCommand(barId));

    expect(result).toEqual({ url: 'https://portal.stripe.com/recovered' });
    expect(stripeClientMock.client.billingPortal.sessions.create).toHaveBeenLastCalledWith({
      customer: 'cus_remote',
      return_url: 'https://app.example.com/bars/bar_123/dashboard',
    });
  });

  it('should map Stripe portal failures to an application error code', async () => {
    const barId = 'bar_123' as BarId;
    readRepoMock.findByBarId.mockResolvedValue({ stripeCustomerId: 'cus_123' });
    stripeClientMock.client.billingPortal.sessions.create.mockRejectedValue(new Error('Stripe unavailable'));

    await expect(handler.execute(new CreateCustomerPortalSessionCommand(barId))).rejects.toThrow(
      new InternalServerErrorException(ErrorCodes.STRIPE_BILLING_PORTAL_FAILED),
    );
  });
});
