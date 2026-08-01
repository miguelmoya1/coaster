import Stripe from 'stripe';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { HandleCheckoutCompletedCommand } from '../impl/handle-checkout-completed.command';
import { HandleCheckoutCompletedHandler } from './handle-checkout-completed.handler';

describe('HandleCheckoutCompletedHandler', () => {
  let handler: HandleCheckoutCompletedHandler;
  let writeRepoMock: any;

  beforeEach(() => {
    writeRepoMock = {
      upsertBarCustomerId: vi.fn(),
    };
    handler = new HandleCheckoutCompletedHandler(writeRepoMock as any);
  });

  it('should ignore sessions with mode !== subscription', async () => {
    const session = { mode: 'payment' } as Stripe.Checkout.Session;
    await handler.execute(new HandleCheckoutCompletedCommand(session));

    expect(writeRepoMock.upsertBarCustomerId).not.toHaveBeenCalled();
  });

  it('should ignore sessions missing barId or customerId', async () => {
    const session = { mode: 'subscription', customer: 'cus_123' } as Stripe.Checkout.Session;
    await handler.execute(new HandleCheckoutCompletedCommand(session));

    expect(writeRepoMock.upsertBarCustomerId).not.toHaveBeenCalled();
  });

  it('should upsert customer and subscription ID when session is valid', async () => {
    const session = {
      mode: 'subscription',
      metadata: { barId: 'bar_123' },
      customer: 'cus_123',
      subscription: 'sub_123',
    } as any;

    await handler.execute(new HandleCheckoutCompletedCommand(session));

    expect(writeRepoMock.upsertBarCustomerId).toHaveBeenCalledWith('bar_123', 'cus_123', 'sub_123');
  });
});
