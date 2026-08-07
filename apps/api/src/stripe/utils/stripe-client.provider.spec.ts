import { InternalServerErrorException } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { StripeClient } from './stripe-client.provider';

describe('StripeClient', () => {
  let configServiceMock: any;

  beforeEach(() => {
    configServiceMock = {
      get: vi.fn(),
    };
  });

  it('should throw InternalServerErrorException if STRIPE_SECRET_KEY is missing', () => {
    configServiceMock.get.mockReturnValue(undefined);
    const clientProvider = new StripeClient(configServiceMock);

    expect(() => clientProvider.client).toThrow(InternalServerErrorException);
  });

  it('should initialize and return Stripe client when STRIPE_SECRET_KEY is present', () => {
    configServiceMock.get.mockReturnValue('sk_test_123');
    const clientProvider = new StripeClient(configServiceMock);

    const client = clientProvider.client;
    expect(client).toBeDefined();
    expect(clientProvider.client).toBe(client);
  });
});
