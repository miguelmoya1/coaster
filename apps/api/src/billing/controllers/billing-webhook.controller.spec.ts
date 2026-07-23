import { beforeEach, describe, expect, it, vi } from 'vitest';
import { BillingWebhookController } from './billing-webhook.controller';

describe('BillingWebhookController', () => {
  let controller: BillingWebhookController;
  let billingServiceMock: any;

  beforeEach(() => {
    billingServiceMock = {
      handleStripeWebhook: vi.fn().mockResolvedValue(undefined),
    };

    controller = new BillingWebhookController(billingServiceMock);
  });

  it('should pass rawBody and signature to BillingService and return received: true', async () => {
    const mockReq: any = { rawBody: '{"id":"evt_123"}' };
    const mockSig = 'sig_header_123';

    const result = await controller.handleWebhook(mockReq, mockSig);

    expect(billingServiceMock.handleStripeWebhook).toHaveBeenCalledWith('{"id":"evt_123"}', mockSig);
    expect(result).toEqual({ received: true });
  });

  it('should default rawBody to empty string if missing', async () => {
    const mockReq: any = {};

    const result = await controller.handleWebhook(mockReq, undefined);

    expect(billingServiceMock.handleStripeWebhook).toHaveBeenCalledWith('', undefined);
    expect(result).toEqual({ received: true });
  });
});
