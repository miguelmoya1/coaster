import { BadRequestException, InternalServerErrorException } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { StripeWebhookGuard } from './stripe-webhook.guard';

describe('StripeWebhookGuard', () => {
  let guard: StripeWebhookGuard;
  let stripeClientMock: any;
  let configServiceMock: any;
  let readRepoMock: any;
  let executionContextMock: any;
  let requestMock: any;

  beforeEach(() => {
    stripeClientMock = {
      client: {
        webhooks: {
          constructEvent: vi.fn(),
        },
      },
    };

    configServiceMock = {
      get: vi.fn(),
    };

    readRepoMock = {
      findWebhookEventById: vi.fn(),
    };

    requestMock = {
      headers: {},
      rawBody: '{"id":"evt_123"}',
    };

    executionContextMock = {
      switchToHttp: () => ({
        getRequest: () => requestMock,
      }),
    };

    guard = new StripeWebhookGuard(stripeClientMock, configServiceMock, readRepoMock as any);
  });

  it('should throw InternalServerErrorException if STRIPE_WEBHOOK_SECRET is not set', async () => {
    configServiceMock.get.mockReturnValue(undefined);

    await expect(guard.canActivate(executionContextMock)).rejects.toThrow(InternalServerErrorException);
  });

  it('should throw BadRequestException if stripe-signature header is missing', async () => {
    configServiceMock.get.mockReturnValue('whsec_secret');

    await expect(guard.canActivate(executionContextMock)).rejects.toThrow(BadRequestException);
  });

  it('should throw BadRequestException if signature verification fails', async () => {
    configServiceMock.get.mockReturnValue('whsec_secret');
    requestMock.headers['stripe-signature'] = 'invalid_sig';
    stripeClientMock.client.webhooks.constructEvent.mockImplementation(() => {
      throw new Error('Bad signature');
    });

    await expect(guard.canActivate(executionContextMock)).rejects.toThrow(BadRequestException);
  });

  it('should attach event and alreadyProcessed = false when signature is valid and event is new', async () => {
    configServiceMock.get.mockReturnValue('whsec_secret');
    requestMock.headers['stripe-signature'] = 'valid_sig';

    const event = { id: 'evt_123', type: 'checkout.session.completed' };
    stripeClientMock.client.webhooks.constructEvent.mockReturnValue(event);
    readRepoMock.findWebhookEventById.mockResolvedValue(null);

    const canActivate = await guard.canActivate(executionContextMock);

    expect(canActivate).toBe(true);
    expect(requestMock.stripeEvent).toEqual(event);
    expect(requestMock.stripeEventAlreadyProcessed).toBe(false);
  });

  it('should attach alreadyProcessed = true when event has already been recorded', async () => {
    configServiceMock.get.mockReturnValue('whsec_secret');
    requestMock.headers['stripe-signature'] = 'valid_sig';

    const event = { id: 'evt_123', type: 'checkout.session.completed' };
    stripeClientMock.client.webhooks.constructEvent.mockReturnValue(event);
    readRepoMock.findWebhookEventById.mockResolvedValue({ id: 'db_id', stripeEventId: 'evt_123' });

    const canActivate = await guard.canActivate(executionContextMock);

    expect(canActivate).toBe(true);
    expect(requestMock.stripeEvent).toEqual(event);
    expect(requestMock.stripeEventAlreadyProcessed).toBe(true);
  });
});
