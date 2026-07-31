import { BarId } from '@coaster/common';
import { BadRequestException } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CreateCustomerPortalSessionCommand } from '../impl/create-customer-portal-session.command';
import { CreateCustomerPortalSessionHandler } from './create-customer-portal-session.handler';

describe('CreateCustomerPortalSessionHandler', () => {
  let handler: CreateCustomerPortalSessionHandler;
  let stripeClientMock: any;
  let readRepoMock: any;

  beforeEach(() => {
    stripeClientMock = {
      client: {
        billingPortal: {
          sessions: {
            create: vi.fn(),
          },
        },
      },
    };

    readRepoMock = {
      findSubscriptionByBarId: vi.fn(),
    };

    handler = new CreateCustomerPortalSessionHandler(stripeClientMock, readRepoMock as any);
  });

  it('should throw BadRequestException if no subscription or stripeCustomerId exists', async () => {
    const barId = 'bar_123' as BarId;
    readRepoMock.findSubscriptionByBarId.mockResolvedValue(null);

    const command = new CreateCustomerPortalSessionCommand(barId, 'https://return');

    await expect(handler.execute(command)).rejects.toThrow(BadRequestException);
  });

  it('should create billing portal session when stripeCustomerId exists', async () => {
    const barId = 'bar_123' as BarId;
    readRepoMock.findSubscriptionByBarId.mockResolvedValue({ stripeCustomerId: 'cus_123' });
    stripeClientMock.client.billingPortal.sessions.create.mockResolvedValue({ url: 'https://portal.stripe.com' });

    const command = new CreateCustomerPortalSessionCommand(barId, 'https://return');

    const result = await handler.execute(command);

    expect(stripeClientMock.client.billingPortal.sessions.create).toHaveBeenCalledWith({
      customer: 'cus_123',
      return_url: 'https://return',
    });
    expect(result).toEqual({ url: 'https://portal.stripe.com' });
  });
});
