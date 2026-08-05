import { ErrorCodes } from '@coaster/common';
import { InternalServerErrorException } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import Stripe from 'stripe';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CheckStripeWebhookCommand } from '../commands';
import type { StripeWebhookWriteRepository } from '../data-access';
import type { FastifyStripeRequest } from '../guards/stripe-webhook.guard';
import { StripeWebhookController } from './stripe-webhook.controller';

describe('StripeWebhookController', () => {
  let controller: StripeWebhookController;
  let commandBusMock: { execute: ReturnType<typeof vi.fn> };
  let webhookRepoMock: {
    claim: ReturnType<typeof vi.fn>;
    markProcessed: ReturnType<typeof vi.fn>;
    markFailed: ReturnType<typeof vi.fn>;
  };

  const event = {
    id: 'evt_test_123',
    type: 'checkout.session.completed',
    data: { object: {} },
  } as Stripe.Event;

  beforeEach(() => {
    commandBusMock = {
      execute: vi.fn().mockResolvedValue(undefined),
    };
    webhookRepoMock = {
      claim: vi.fn().mockResolvedValue(true),
      markProcessed: vi.fn().mockResolvedValue(undefined),
      markFailed: vi.fn().mockResolvedValue(undefined),
    };

    controller = new StripeWebhookController(
      commandBusMock as unknown as CommandBus,
      webhookRepoMock as unknown as StripeWebhookWriteRepository,
    );
  });

  it('should execute CheckStripeWebhookCommand and return { received: true } when request contains stripeEvent', async () => {
    const request = { stripeEvent: event } as FastifyStripeRequest;

    const result = await controller.handleWebhook(request);

    expect(commandBusMock.execute).toHaveBeenCalledWith(new CheckStripeWebhookCommand(event));
    expect(webhookRepoMock.markProcessed).toHaveBeenCalledWith(event.id);
    expect(result).toEqual({ received: true });
  });

  it('should skip processing when the event was already claimed', async () => {
    webhookRepoMock.claim.mockResolvedValue(false);
    const request = { stripeEvent: event } as FastifyStripeRequest;

    const result = await controller.handleWebhook(request);

    expect(commandBusMock.execute).not.toHaveBeenCalled();
    expect(webhookRepoMock.markProcessed).not.toHaveBeenCalled();
    expect(result).toEqual({ received: true });
  });

  it('should mark the event as failed and rethrow so Stripe retries the delivery', async () => {
    const failure = new Error('projection blew up');
    commandBusMock.execute.mockRejectedValue(failure);
    const request = { stripeEvent: event } as FastifyStripeRequest;

    await expect(controller.handleWebhook(request)).rejects.toThrow(failure);

    expect(webhookRepoMock.markFailed).toHaveBeenCalledWith(event.id, failure);
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
