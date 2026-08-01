import Stripe from 'stripe';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { RecordStripeWebhookEventCommand } from '../impl/record-stripe-webhook-event.command';
import { RecordStripeWebhookEventHandler } from './record-stripe-webhook-event.handler';

describe('RecordStripeWebhookEventHandler', () => {
  let handler: RecordStripeWebhookEventHandler;
  let writeRepoMock: any;

  beforeEach(() => {
    writeRepoMock = {
      recordStripeWebhookEvent: vi.fn(),
    };
    handler = new RecordStripeWebhookEventHandler(writeRepoMock as any);
  });

  it('should call recordStripeWebhookEvent on write repository', async () => {
    const event = { id: 'evt_123', type: 'checkout.session.completed' } as Stripe.Event;
    await handler.execute(new RecordStripeWebhookEventCommand(event));

    expect(writeRepoMock.recordStripeWebhookEvent).toHaveBeenCalledWith('evt_123', 'checkout.session.completed', event);
  });
});
