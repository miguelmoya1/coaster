import { Controller, HttpCode, Post, Req, UseGuards } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import Stripe from 'stripe';
import {
  type FastifyStripeRequest,
  HandleCheckoutCompletedCommand,
  HandleInvoicePaymentFailedCommand,
  HandleSubscriptionChangedCommand,
  RecordStripeWebhookEventCommand,
  StripeWebhookGuard,
} from '../stripe';

@Controller('billing')
export class BillingWebhookController {
  constructor(private readonly _commandBus: CommandBus) {}

  @Post('webhook')
  @UseGuards(StripeWebhookGuard)
  @HttpCode(200)
  async handleWebhook(@Req() request: FastifyStripeRequest): Promise<{ received: true }> {
    if (request.stripeEventAlreadyProcessed) {
      return { received: true };
    }

    const event = request.stripeEvent;

    if (!event) {
      return { received: true };
    }

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
        break;
    }

    await this._commandBus.execute(new RecordStripeWebhookEventCommand(event));

    return { received: true };
  }
}
