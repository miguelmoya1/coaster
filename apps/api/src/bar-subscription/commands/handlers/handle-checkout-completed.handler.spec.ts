import Stripe from 'stripe';
import { beforeEach, describe, expect, it } from 'vitest';
import { HandleCheckoutCompletedCommand } from '../impl/handle-checkout-completed.command';
import { HandleCheckoutCompletedHandler } from './handle-checkout-completed.handler';

describe('HandleCheckoutCompletedHandler (bar-subscription)', () => {
  let handler: HandleCheckoutCompletedHandler;

  beforeEach(() => {
    handler = new HandleCheckoutCompletedHandler();
  });

  it('should execute command successfully for a checkout session', async () => {
    const session = { id: 'cs_bar_sub_123' } as Stripe.Checkout.Session;
    await expect(handler.execute(new HandleCheckoutCompletedCommand(session))).resolves.toBeUndefined();
  });
});
