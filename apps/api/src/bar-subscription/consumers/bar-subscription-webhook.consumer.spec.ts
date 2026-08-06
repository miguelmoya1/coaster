import {
  StripeCheckoutCompletedEvent,
  StripeInvoicePaidEvent,
  StripeInvoicePaymentFailedEvent,
  StripeSubscriptionChangedEvent,
  type StripeWebhookDispatcher,
} from '@coaster/stripe';
import { Logger } from '@nestjs/common';
import type { CommandBus } from '@nestjs/cqrs';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  HandleCheckoutCompletedCommand,
  HandleInvoicePaidCommand,
  HandleInvoicePaymentFailedCommand,
  HandleSubscriptionChangedCommand,
} from '../commands';
import { BarSubscriptionWebhookConsumer } from './bar-subscription-webhook.consumer';

describe('BarSubscriptionWebhookConsumer', () => {
  let consumer: BarSubscriptionWebhookConsumer;
  let dispatcherMock: { register: ReturnType<typeof vi.fn> };
  let commandBusMock: { execute: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    vi.clearAllMocks();

    dispatcherMock = { register: vi.fn() };
    commandBusMock = { execute: vi.fn().mockResolvedValue(undefined) };

    consumer = new BarSubscriptionWebhookConsumer(
      dispatcherMock as unknown as StripeWebhookDispatcher,
      commandBusMock as unknown as CommandBus,
    );

    vi.spyOn(Logger.prototype, 'debug').mockReturnValue(undefined);
  });

  it('should register itself with the dispatcher on init', () => {
    consumer.onModuleInit();

    expect(dispatcherMock.register).toHaveBeenCalledWith(consumer);
  });

  it('should map a completed checkout to HandleCheckoutCompletedCommand', async () => {
    const session = { id: 'cs_1' } as any;

    await consumer.handle(new StripeCheckoutCompletedEvent(session));

    expect(commandBusMock.execute).toHaveBeenCalledWith(new HandleCheckoutCompletedCommand(session));
  });

  it('should map a subscription change to HandleSubscriptionChangedCommand', async () => {
    const subscription = { id: 'sub_1' } as any;

    await consumer.handle(new StripeSubscriptionChangedEvent(subscription));

    expect(commandBusMock.execute).toHaveBeenCalledWith(new HandleSubscriptionChangedCommand(subscription));
  });

  it('should map a paid invoice to HandleInvoicePaidCommand', async () => {
    const invoice = { id: 'in_1' } as any;

    await consumer.handle(new StripeInvoicePaidEvent(invoice));

    expect(commandBusMock.execute).toHaveBeenCalledWith(new HandleInvoicePaidCommand(invoice));
  });

  it('should map a failed invoice payment to HandleInvoicePaymentFailedCommand', async () => {
    const invoice = { id: 'in_1' } as any;

    await consumer.handle(new StripeInvoicePaymentFailedEvent(invoice));

    expect(commandBusMock.execute).toHaveBeenCalledWith(new HandleInvoicePaymentFailedCommand(invoice));
  });

  it('should propagate a command failure instead of swallowing it', async () => {
    const failure = new Error('barId missing');
    commandBusMock.execute.mockRejectedValue(failure);

    await expect(consumer.handle(new StripeSubscriptionChangedEvent({ id: 'sub_1' } as any))).rejects.toThrow(failure);
  });
});
