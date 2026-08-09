import { ErrorCodes } from '@coaster/common';
import { StripeWebhookGuard, type FastifyStripeRequest } from '@coaster/stripe';
import { Controller, InternalServerErrorException, Logger, Post, Req, UseGuards } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import { SkipThrottle } from '@nestjs/throttler';
import type { Event as StripeEvent } from 'stripe';
import {
  HandleCheckoutCompletedCommand,
  HandleInvoicePaidCommand,
  HandleInvoicePaymentFailedCommand,
  HandleSubscriptionChangedCommand,
} from '../commands';

@Controller('stripe')
@SkipThrottle()
export class StripeWebhookController {
  private readonly _logger = new Logger(StripeWebhookController.name);

  constructor(private readonly _commandBus: CommandBus) {}

  @Post('webhook')
  @UseGuards(StripeWebhookGuard)
  async handleWebhook(@Req() request: FastifyStripeRequest): Promise<{ received: true }> {
    const event = request.stripeEvent;

    if (!event) {
      this._logger.warn('No Stripe event attached to request object');
      throw new InternalServerErrorException(ErrorCodes.STRIPE_WEBHOOK_EVENT_MISSING);
    }

    this._logger.debug(`Receiving webhook and routing event type: ${event.type}`);

    await this.#route(event);

    return { received: true };
  }

  async #route(event: StripeEvent): Promise<void> {
    switch (event.type) {
      case 'checkout.session.completed': {
        await this._commandBus.execute(new HandleCheckoutCompletedCommand(event.data.object));
        break;
      }
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted':
      case 'customer.subscription.paused':
      case 'customer.subscription.resumed': {
        await this._commandBus.execute(new HandleSubscriptionChangedCommand(event.data.object));
        break;
      }
      case 'invoice.paid': {
        await this._commandBus.execute(new HandleInvoicePaidCommand(event.data.object));
        break;
      }
      case 'invoice.payment_failed': {
        await this._commandBus.execute(new HandleInvoicePaymentFailedCommand(event.data.object));
        break;
      }
      default:
        this._logger.debug(`Unhandled webhook event type: ${event.type}`);
        break;
    }
  }
}
