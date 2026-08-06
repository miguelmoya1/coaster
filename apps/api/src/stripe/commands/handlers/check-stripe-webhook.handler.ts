import { Injectable, Logger } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import {
  StripeCheckoutCompletedEvent,
  StripeInvoicePaidEvent,
  StripeInvoicePaymentFailedEvent,
  StripeSubscriptionChangedEvent,
} from '../../events';
import { StripeWebhookDispatcher } from '../../services';
import { CheckStripeWebhookCommand } from '../impl/check-stripe-webhook.command';

@Injectable()
@CommandHandler(CheckStripeWebhookCommand)
export class CheckStripeWebhookHandler implements ICommandHandler<CheckStripeWebhookCommand, void> {
  readonly #logger = new Logger(CheckStripeWebhookHandler.name);

  constructor(private readonly _dispatcher: StripeWebhookDispatcher) {}

  async execute(command: CheckStripeWebhookCommand): Promise<void> {
    const { event } = command;

    this.#logger.debug(`Checking and dispatching Stripe webhook event type: ${event.type}`);

    switch (event.type) {
      case 'checkout.session.completed': {
        await this._dispatcher.dispatch(new StripeCheckoutCompletedEvent(event.data.object));
        break;
      }
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted':
      case 'customer.subscription.paused':
      case 'customer.subscription.resumed': {
        await this._dispatcher.dispatch(new StripeSubscriptionChangedEvent(event.data.object));
        break;
      }
      case 'invoice.payment_failed': {
        await this._dispatcher.dispatch(new StripeInvoicePaymentFailedEvent(event.data.object));
        break;
      }
      case 'invoice.paid': {
        await this._dispatcher.dispatch(new StripeInvoicePaidEvent(event.data.object));
        break;
      }
      default:
        this.#logger.debug(`Unhandled webhook event type: ${event.type}`);
        break;
    }
  }
}
