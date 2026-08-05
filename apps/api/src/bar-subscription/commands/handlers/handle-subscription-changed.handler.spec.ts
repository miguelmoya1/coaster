import Stripe from 'stripe';
import { beforeEach, describe, expect, it } from 'vitest';
import { HandleSubscriptionChangedCommand } from '../impl/handle-subscription-changed.command';
import { HandleSubscriptionChangedHandler } from './handle-subscription-changed.handler';

describe('HandleSubscriptionChangedHandler (bar-subscription)', () => {
  let handler: HandleSubscriptionChangedHandler;

  beforeEach(() => {
    handler = new HandleSubscriptionChangedHandler();
  });

  it('should execute command successfully when subscription changes', async () => {
    const subscription = { id: 'sub_bar_changed_123' } as Stripe.Subscription;
    await expect(handler.execute(new HandleSubscriptionChangedCommand(subscription))).resolves.toBeUndefined();
  });
});
