import type { EstablishmentId } from '@coaster/common';
import { ErrorCodes } from '@coaster/common';
import { BadRequestException, InternalServerErrorException } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CreateCustomerPortalSessionCommand } from '../impl/create-customer-portal-session.command';
import { CreateCustomerPortalSessionHandler } from './create-customer-portal-session.handler';

describe('CreateCustomerPortalSessionHandler (establishment-subscription)', () => {
  let handler: CreateCustomerPortalSessionHandler;
  let stripeApiMock: any;
  let readRepoMock: any;
  let configServiceMock: any;

  const establishmentId = 'establishment_123' as EstablishmentId;
  const returnUrl = 'https://app.example.com/establishments/establishment_123/dashboard';

  beforeEach(() => {
    stripeApiMock = {
      createBillingPortalSession: vi.fn(),
      findSubscriptionCustomerId: vi.fn().mockResolvedValue(null),
    };

    readRepoMock = {
      findByEstablishmentId: vi.fn(),
    };
    configServiceMock = {
      get: vi.fn().mockReturnValue('https://app.example.com'),
    };

    handler = new CreateCustomerPortalSessionHandler(stripeApiMock, readRepoMock, configServiceMock);
  });

  it('should throw BadRequestException if no subscription or stripeCustomerId exists', async () => {
    readRepoMock.findByEstablishmentId.mockResolvedValue(null);

    await expect(handler.execute(new CreateCustomerPortalSessionCommand(establishmentId))).rejects.toThrow(
      new BadRequestException(ErrorCodes.STRIPE_CUSTOMER_NOT_FOUND),
    );
    expect(stripeApiMock.createBillingPortalSession).not.toHaveBeenCalled();
  });

  it('should create billing portal session when stripeCustomerId exists', async () => {
    readRepoMock.findByEstablishmentId.mockResolvedValue({ stripeCustomerId: 'cus_123' });
    stripeApiMock.createBillingPortalSession.mockResolvedValue({ url: 'https://portal.stripe.com' });

    const result = await handler.execute(new CreateCustomerPortalSessionCommand(establishmentId));

    expect(stripeApiMock.createBillingPortalSession).toHaveBeenCalledWith('cus_123', returnUrl);
    expect(result).toEqual({ url: 'https://portal.stripe.com' });
  });

  it('should recover the customer from the remote subscription when the local customer is stale', async () => {
    readRepoMock.findByEstablishmentId.mockResolvedValue({
      stripeCustomerId: 'cus_stale',
      stripeSubscriptionId: 'sub_123',
    });
    stripeApiMock.createBillingPortalSession
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ url: 'https://portal.stripe.com/recovered' });
    stripeApiMock.findSubscriptionCustomerId.mockResolvedValue('cus_remote');

    const result = await handler.execute(new CreateCustomerPortalSessionCommand(establishmentId));

    expect(result).toEqual({ url: 'https://portal.stripe.com/recovered' });
    expect(stripeApiMock.createBillingPortalSession).toHaveBeenLastCalledWith('cus_remote', returnUrl);
  });

  it('should throw when the customer is gone and no remote customer can be resolved', async () => {
    readRepoMock.findByEstablishmentId.mockResolvedValue({
      stripeCustomerId: 'cus_stale',
      stripeSubscriptionId: 'sub_123',
    });
    stripeApiMock.createBillingPortalSession.mockResolvedValue(null);
    stripeApiMock.findSubscriptionCustomerId.mockResolvedValue(null);

    await expect(handler.execute(new CreateCustomerPortalSessionCommand(establishmentId))).rejects.toThrow(
      new BadRequestException(ErrorCodes.STRIPE_CUSTOMER_NOT_FOUND),
    );
  });

  it('should surface Stripe transport failures raised by the adapter', async () => {
    readRepoMock.findByEstablishmentId.mockResolvedValue({ stripeCustomerId: 'cus_123' });
    stripeApiMock.createBillingPortalSession.mockRejectedValue(
      new InternalServerErrorException(ErrorCodes.STRIPE_BILLING_PORTAL_FAILED),
    );

    await expect(handler.execute(new CreateCustomerPortalSessionCommand(establishmentId))).rejects.toThrow(
      new InternalServerErrorException(ErrorCodes.STRIPE_BILLING_PORTAL_FAILED),
    );
  });
});
