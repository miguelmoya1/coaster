import { Controller, HttpCode, Logger, Post, Req, UseGuards } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import Stripe from 'stripe';
import { type FastifyStripeRequest, StripeWebhookGuard } from '../../stripe';
import {
  HandleCheckoutCompletedCommand,
  HandleInvoicePaymentFailedCommand,
  HandleSubscriptionChangedCommand,
  RecordStripeWebhookEventCommand,
} from '../commands';

@Controller('billing')
export class BillingWebhookController {
  private readonly _logger = new Logger(BillingWebhookController.name);

  constructor(private readonly _commandBus: CommandBus) {}

  @Post('webhook')
  @UseGuards(StripeWebhookGuard)
  @HttpCode(200)
  async handleWebhook(@Req() request: FastifyStripeRequest): Promise<{ received: true }> {
    if (request.stripeEventAlreadyProcessed) {
      this._logger.debug('Webhook event already processed previously, returning received: true early');
      return { received: true };
    }

    const event = request.stripeEvent;

    if (!event) {
      this._logger.warn('No Stripe event attached to request object');
      return { received: true };
    }

    this._logger.debug(`Dispatching command for webhook event type: ${event.type}`);

    switch (event.type) {
      case 'checkout.session.completed': {
        await this._commandBus.execute(
          new HandleCheckoutCompletedCommand(event.data.object as Stripe.Checkout.Session),
        );
        break;
      }
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted': {
        await this._commandBus.execute(new HandleSubscriptionChangedCommand(event.data.object as Stripe.Subscription));
        break;
      }
      case 'invoice.payment_failed': {
        await this._commandBus.execute(new HandleInvoicePaymentFailedCommand(event.data.object as Stripe.Invoice));
        break;
      }
      default:
        this._logger.debug(`Unhandled webhook event type: ${event.type}`);
        break;
    }

    await this._commandBus.execute(new RecordStripeWebhookEventCommand(event));

    return { received: true };
  }
}
