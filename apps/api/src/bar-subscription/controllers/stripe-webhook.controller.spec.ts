import { ErrorCodes } from '@coaster/common';
import type { FastifyStripeRequest, StripeWebhookWriteRepository } from '@coaster/stripe';
import { InternalServerErrorException, Logger } from '@nestjs/common';
import type { CommandBus } from '@nestjs/cqrs';
import type Stripe from 'stripe';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  HandleCheckoutCompletedCommand,
  HandleInvoicePaidCommand,
  HandleInvoicePaymentFailedCommand,
  HandleSubscriptionChangedCommand,
} from '../commands';
import { StripeWebhookController } from './stripe-webhook.controller';

describe('StripeWebhookController', () => {
  let controller: StripeWebhookController;
  let commandBusMock: { execute: ReturnType<typeof vi.fn> };
  let webhookRepoMock: {
    claim: ReturnType<typeof vi.fn>;
    markProcessed: ReturnType<typeof vi.fn>;
    markFailed: ReturnType<typeof vi.fn>;
  };

  const buildEvent = (type: string, object: unknown): Stripe.Event =>
    ({ id: 'evt_test_123', type, data: { object } }) as Stripe.Event;

  const requestFor = (event: Stripe.Event): FastifyStripeRequest => ({ stripeEvent: event }) as FastifyStripeRequest;

  beforeEach(() => {
    vi.clearAllMocks();

    commandBusMock = { execute: vi.fn().mockResolvedValue(undefined) };
    webhookRepoMock = {
      claim: vi.fn().mockResolvedValue(true),
      markProcessed: vi.fn().mockResolvedValue(undefined),
      markFailed: vi.fn().mockResolvedValue(undefined),
    };

    controller = new StripeWebhookController(
      commandBusMock as unknown as CommandBus,
      webhookRepoMock as unknown as StripeWebhookWriteRepository,
    );

    vi.spyOn(Logger.prototype, 'debug').mockReturnValue(undefined);
    vi.spyOn(Logger.prototype, 'warn').mockReturnValue(undefined);
  });

  it('should execute HandleCheckoutCompletedCommand when event type is checkout.session.completed', async () => {
    const session = { id: 'cs_1' };

    const result = await controller.handleWebhook(requestFor(buildEvent('checkout.session.completed', session)));

    expect(commandBusMock.execute).toHaveBeenCalledWith(new HandleCheckoutCompletedCommand(session as never));
    expect(webhookRepoMock.markProcessed).toHaveBeenCalledWith('evt_test_123');
    expect(result).toEqual({ received: true });
  });

  it.each([
    'customer.subscription.created',
    'customer.subscription.updated',
    'customer.subscription.deleted',
    'customer.subscription.paused',
    'customer.subscription.resumed',
  ])('should execute HandleSubscriptionChangedCommand when event type is %s', async (eventType) => {
    const subscription = { id: 'sub_1' };

    await controller.handleWebhook(requestFor(buildEvent(eventType, subscription)));

    expect(commandBusMock.execute).toHaveBeenCalledWith(new HandleSubscriptionChangedCommand(subscription as never));
  });

  it('should execute HandleInvoicePaidCommand when event type is invoice.paid', async () => {
    const invoice = { id: 'in_1' };

    await controller.handleWebhook(requestFor(buildEvent('invoice.paid', invoice)));

    expect(commandBusMock.execute).toHaveBeenCalledWith(new HandleInvoicePaidCommand(invoice as never));
  });

  it('should execute HandleInvoicePaymentFailedCommand when event type is invoice.payment_failed', async () => {
    const invoice = { id: 'in_1' };

    await controller.handleWebhook(requestFor(buildEvent('invoice.payment_failed', invoice)));

    expect(commandBusMock.execute).toHaveBeenCalledWith(new HandleInvoicePaymentFailedCommand(invoice as never));
  });

  it('should mark an unhandled event type as processed without executing any command', async () => {
    const result = await controller.handleWebhook(requestFor(buildEvent('customer.created', { id: 'cus_1' })));

    expect(commandBusMock.execute).not.toHaveBeenCalled();
    expect(webhookRepoMock.markProcessed).toHaveBeenCalledWith('evt_test_123');
    expect(result).toEqual({ received: true });
  });

  it('should skip processing when the event was already claimed', async () => {
    webhookRepoMock.claim.mockResolvedValue(false);

    const result = await controller.handleWebhook(requestFor(buildEvent('invoice.paid', { id: 'in_1' })));

    expect(commandBusMock.execute).not.toHaveBeenCalled();
    expect(webhookRepoMock.markProcessed).not.toHaveBeenCalled();
    expect(result).toEqual({ received: true });
  });

  it('should mark the event as failed and rethrow so Stripe retries the delivery', async () => {
    const failure = new Error('projection blew up');
    commandBusMock.execute.mockRejectedValue(failure);
    const request = requestFor(buildEvent('invoice.paid', { id: 'in_1' }));

    await expect(controller.handleWebhook(request)).rejects.toThrow(failure);

    expect(webhookRepoMock.markFailed).toHaveBeenCalledWith('evt_test_123', failure);
    expect(webhookRepoMock.markProcessed).not.toHaveBeenCalled();
  });

  it('should throw InternalServerErrorException when stripeEvent is missing on request', async () => {
    const request = {} as FastifyStripeRequest;

    await expect(controller.handleWebhook(request)).rejects.toThrow(
      new InternalServerErrorException(ErrorCodes.STRIPE_WEBHOOK_EVENT_MISSING),
    );
    expect(commandBusMock.execute).not.toHaveBeenCalled();
    expect(webhookRepoMock.claim).not.toHaveBeenCalled();
  });
});
