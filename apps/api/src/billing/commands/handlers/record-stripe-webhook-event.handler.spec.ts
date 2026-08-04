import Stripe from 'stripe';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { RecordStripeWebhookEventCommand } from '../impl/record-stripe-webhook-event.command';
import { RecordStripeWebhookEventHandler } from './record-stripe-webhook-event.handler';

describe('RecordStripeWebhookEventHandler', () => {
  let handler: RecordStripeWebhookEventHandler;
  let writeRepoMock: any;

  beforeEach(() => {
    writeRepoMock = {
      claimStripeWebhookEvent: vi.fn().mockResolvedValue(true),
      markStripeWebhookEventProcessed: vi.fn(),
      markStripeWebhookEventFailed: vi.fn(),
    };
    handler = new RecordStripeWebhookEventHandler(writeRepoMock as any);
  });

  it('should claim and mark a webhook event as processed', async () => {
    const event = { id: 'evt_123', type: 'checkout.session.completed' } as Stripe.Event;
    await handler.execute(new RecordStripeWebhookEventCommand(event));

    expect(writeRepoMock.claimStripeWebhookEvent).toHaveBeenCalledWith(event);
    expect(writeRepoMock.markStripeWebhookEventProcessed).toHaveBeenCalledWith(event.id);
  });
});
