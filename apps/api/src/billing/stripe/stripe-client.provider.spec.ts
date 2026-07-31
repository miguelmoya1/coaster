import { InternalServerErrorException } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { StripeClient } from './stripe-client.provider';

describe('StripeClient', () => {
  let provider: StripeClient;
  let configServiceMock: any;

  beforeEach(() => {
    configServiceMock = {
      get: vi.fn(),
    };
    provider = new StripeClient(configServiceMock);
  });

  it('should throw InternalServerErrorException if STRIPE_SECRET_KEY is not configured', () => {
    configServiceMock.get.mockReturnValue(undefined);

    expect(() => provider.client).toThrow(InternalServerErrorException);
  });

  it('should return Stripe instance when STRIPE_SECRET_KEY is configured', () => {
    configServiceMock.get.mockReturnValue('sk_test_123');

    const client = provider.client;
    expect(client).toBeDefined();
    // Cache check
    expect(provider.client).toBe(client);
  });
});
