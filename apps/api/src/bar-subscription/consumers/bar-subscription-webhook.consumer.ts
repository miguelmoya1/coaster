import {
  StripeCheckoutCompletedEvent,
  StripeInvoicePaidEvent,
  StripeInvoicePaymentFailedEvent,
  StripeSubscriptionChangedEvent,
  StripeWebhookDispatcher,
  type StripeWebhookConsumer,
  type StripeWebhookEvent,
} from '@coaster/stripe';
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import {
  HandleCheckoutCompletedCommand,
  HandleInvoicePaidCommand,
  HandleInvoicePaymentFailedCommand,
  HandleSubscriptionChangedCommand,
} from '../commands';

@Injectable()
export class BarSubscriptionWebhookConsumer implements StripeWebhookConsumer, OnModuleInit {
  readonly #logger = new Logger(BarSubscriptionWebhookConsumer.name);

  constructor(
    private readonly _dispatcher: StripeWebhookDispatcher,
    private readonly _commandBus: CommandBus,
  ) {}

  onModuleInit(): void {
    this._dispatcher.register(this);
  }

  async handle(event: StripeWebhookEvent): Promise<void> {
    if (event instanceof StripeCheckoutCompletedEvent) {
      this.#logger.debug(`Handling StripeCheckoutCompletedEvent for session ${event.session.id}`);
      await this._commandBus.execute(new HandleCheckoutCompletedCommand(event.session));
      return;
    }

    if (event instanceof StripeSubscriptionChangedEvent) {
      this.#logger.debug(`Handling StripeSubscriptionChangedEvent for subscription ${event.subscription.id}`);
      await this._commandBus.execute(new HandleSubscriptionChangedCommand(event.subscription));
      return;
    }

    if (event instanceof StripeInvoicePaidEvent) {
      this.#logger.debug(`Handling StripeInvoicePaidEvent for invoice ${event.invoice.id}`);
      await this._commandBus.execute(new HandleInvoicePaidCommand(event.invoice));
      return;
    }

    if (event instanceof StripeInvoicePaymentFailedEvent) {
      this.#logger.debug(`Handling StripeInvoicePaymentFailedEvent for invoice ${event.invoice.id}`);
      await this._commandBus.execute(new HandleInvoicePaymentFailedCommand(event.invoice));
    }
  }
}
