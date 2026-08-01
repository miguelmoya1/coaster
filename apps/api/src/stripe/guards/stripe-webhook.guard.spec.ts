import { BadRequestException, InternalServerErrorException } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { StripeWebhookGuard } from './stripe-webhook.guard';

describe('StripeWebhookGuard', () => {
  let guard: StripeWebhookGuard;
  let stripeClientMock: any;
  let configServiceMock: any;
  let dbMock: any;

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

    dbMock = {
      dbStripeWebhookEvent: {
        findUnique: vi.fn(),
      },
    };

    guard = new StripeWebhookGuard(stripeClientMock, configServiceMock, dbMock as any);
  });

  const createMockContext = (headers: Record<string, string> = {}, rawBody?: string) => {
    const request: any = { headers, rawBody };
    const context = {
      switchToHttp: () => ({
        getRequest: () => request,
      }),
    };
    return { context, request };
  };

  it('should throw InternalServerErrorException if STRIPE_WEBHOOK_SECRET is missing', async () => {
    configServiceMock.get.mockReturnValue(undefined);
    const { context } = createMockContext({ 'stripe-signature': 'sig_123' }, 'body');

    await expect(guard.canActivate(context as any)).rejects.toThrow(InternalServerErrorException);
  });

  it('should throw BadRequestException if signature is missing', async () => {
    configServiceMock.get.mockReturnValue('whsec_secret');
    const { context } = createMockContext({}, 'body');

    await expect(guard.canActivate(context as any)).rejects.toThrow(BadRequestException);
  });

  it('should throw BadRequestException if signature verification fails', async () => {
    configServiceMock.get.mockReturnValue('whsec_secret');
    stripeClientMock.client.webhooks.constructEvent.mockImplementation(() => {
      throw new Error('Invalid signature');
    });

    const { context } = createMockContext({ 'stripe-signature': 'sig_invalid' }, 'body');

    await expect(guard.canActivate(context as any)).rejects.toThrow(BadRequestException);
  });

  it('should attach stripeEvent and stripeEventAlreadyProcessed: false when new event', async () => {
    configServiceMock.get.mockReturnValue('whsec_secret');
    const mockEvent = { id: 'evt_123', type: 'checkout.session.completed' };
    stripeClientMock.client.webhooks.constructEvent.mockReturnValue(mockEvent);
    dbMock.dbStripeWebhookEvent.findUnique.mockResolvedValue(null);

    const { context, request } = createMockContext({ 'stripe-signature': 'sig_valid' }, 'body');

    const canActivate = await guard.canActivate(context as any);

    expect(canActivate).toBe(true);
    expect(request.stripeEvent).toEqual(mockEvent);
    expect(request.stripeEventAlreadyProcessed).toBe(false);
  });

  it('should attach stripeEvent and stripeEventAlreadyProcessed: true when event exists in DB', async () => {
    configServiceMock.get.mockReturnValue('whsec_secret');
    const mockEvent = { id: 'evt_123', type: 'checkout.session.completed' };
    stripeClientMock.client.webhooks.constructEvent.mockReturnValue(mockEvent);
    dbMock.dbStripeWebhookEvent.findUnique.mockResolvedValue({ id: 'local_id', stripeEventId: 'evt_123' });

    const { context, request } = createMockContext({ 'stripe-signature': 'sig_valid' }, 'body');

    const canActivate = await guard.canActivate(context as any);

    expect(canActivate).toBe(true);
    expect(request.stripeEvent).toEqual(mockEvent);
    expect(request.stripeEventAlreadyProcessed).toBe(true);
  });
});
