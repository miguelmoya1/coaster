import { Injectable, Logger } from '@nestjs/common';
import { CommandHandler, EventBus, ICommandHandler } from '@nestjs/cqrs';
import {
  StripeCheckoutCompletedEvent,
  StripeInvoicePaidEvent,
  StripeInvoicePaymentFailedEvent,
  StripeSubscriptionChangedEvent,
} from '../../events';
import { CheckStripeWebhookCommand } from '../impl/check-stripe-webhook.command';

@Injectable()
@CommandHandler(CheckStripeWebhookCommand)
export class CheckStripeWebhookHandler implements ICommandHandler<CheckStripeWebhookCommand, void> {
  readonly #logger = new Logger(CheckStripeWebhookHandler.name);

  constructor(private readonly _eventBus: EventBus) {}

  async execute(command: CheckStripeWebhookCommand): Promise<void> {
    const { event } = command;

    this.#logger.debug(`Checking and publishing events for Stripe webhook event type: ${event.type}`);

    switch (event.type) {
      case 'checkout.session.completed': {
        await this._eventBus.publish(new StripeCheckoutCompletedEvent(event.data.object));
        break;
      }
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted':
      case 'customer.subscription.paused':
      case 'customer.subscription.resumed': {
        await this._eventBus.publish(new StripeSubscriptionChangedEvent(event.data.object));
        break;
      }
      case 'invoice.payment_failed': {
        await this._eventBus.publish(new StripeInvoicePaymentFailedEvent(event.data.object));
        break;
      }
      case 'invoice.paid': {
        await this._eventBus.publish(new StripeInvoicePaidEvent(event.data.object));
        break;
      }
      default:
        this.#logger.debug(`Unhandled webhook event type: ${event.type}`);
        break;
    }
  }
}
