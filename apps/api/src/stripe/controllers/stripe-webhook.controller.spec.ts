import { ErrorCodes } from '@coaster/common';
import { InternalServerErrorException } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import Stripe from 'stripe';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CheckStripeWebhookCommand } from '../commands';
import type { FastifyStripeRequest } from '../guards/stripe-webhook.guard';
import { StripeWebhookController } from './stripe-webhook.controller';

describe('StripeWebhookController', () => {
  let controller: StripeWebhookController;
  let commandBusMock: { execute: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    commandBusMock = {
      execute: vi.fn().mockResolvedValue(undefined),
    };
    controller = new StripeWebhookController(commandBusMock as unknown as CommandBus);
  });

  it('should execute CheckStripeWebhookCommand and return { received: true } when request contains stripeEvent', async () => {
    const event = {
      id: 'evt_test_123',
      type: 'checkout.session.completed',
      data: { object: {} },
    } as Stripe.Event;

    const request = {
      stripeEvent: event,
    } as FastifyStripeRequest;

    const result = await controller.handleWebhook(request);

    expect(commandBusMock.execute).toHaveBeenCalledWith(new CheckStripeWebhookCommand(event));
    expect(result).toEqual({ received: true });
  });

  it('should throw InternalServerErrorException when stripeEvent is missing on request', async () => {
    const request = {} as FastifyStripeRequest;

    await expect(controller.handleWebhook(request)).rejects.toThrow(
      new InternalServerErrorException(ErrorCodes.STRIPE_WEBHOOK_EVENT_MISSING),
    );
    expect(commandBusMock.execute).not.toHaveBeenCalled();
  });
});
