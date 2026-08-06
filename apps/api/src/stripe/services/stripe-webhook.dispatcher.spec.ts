import { Logger } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { StripeCheckoutCompletedEvent } from '../events';
import { StripeWebhookDispatcher, type StripeWebhookConsumer } from './stripe-webhook.dispatcher';

describe('StripeWebhookDispatcher', () => {
  let dispatcher: StripeWebhookDispatcher;

  const event = new StripeCheckoutCompletedEvent({ id: 'cs_1' } as any);

  const createConsumer = (impl?: () => Promise<void>): StripeWebhookConsumer & { handle: any } => ({
    handle: vi.fn().mockImplementation(impl ?? (() => Promise.resolve())),
  });

  beforeEach(() => {
    vi.clearAllMocks();
    dispatcher = new StripeWebhookDispatcher();

    vi.spyOn(Logger.prototype, 'debug').mockReturnValue(undefined);
  });

  it('should resolve without consumers registered', async () => {
    await expect(dispatcher.dispatch(event)).resolves.toBeUndefined();
  });

  it('should hand the event to every registered consumer', async () => {
    const first = createConsumer();
    const second = createConsumer();
    dispatcher.register(first);
    dispatcher.register(second);

    await dispatcher.dispatch(event);

    expect(first.handle).toHaveBeenCalledWith(event);
    expect(second.handle).toHaveBeenCalledWith(event);
  });

  it('should register a consumer only once', async () => {
    const consumer = createConsumer();
    dispatcher.register(consumer);
    dispatcher.register(consumer);

    await dispatcher.dispatch(event);

    expect(consumer.handle).toHaveBeenCalledTimes(1);
  });

  it('should await each consumer before returning', async () => {
    const order: string[] = [];
    const slow = createConsumer(async () => {
      await new Promise((resolve) => setTimeout(resolve, 10));
      order.push('consumer');
    });
    dispatcher.register(slow);

    await dispatcher.dispatch(event);
    order.push('dispatch-returned');

    expect(order).toEqual(['consumer', 'dispatch-returned']);
  });

  it('should propagate a consumer failure so the delivery can be retried', async () => {
    const failure = new Error('projection failed');
    dispatcher.register(createConsumer(() => Promise.reject(failure)));

    await expect(dispatcher.dispatch(event)).rejects.toThrow(failure);
  });

  it('should stop at the first failing consumer', async () => {
    const failing = createConsumer(() => Promise.reject(new Error('boom')));
    const next = createConsumer();
    dispatcher.register(failing);
    dispatcher.register(next);

    await expect(dispatcher.dispatch(event)).rejects.toThrow('boom');
    expect(next.handle).not.toHaveBeenCalled();
  });
});
