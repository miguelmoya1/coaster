import { Injectable, Logger } from '@nestjs/common';
import type {
  StripeCheckoutCompletedEvent,
  StripeInvoicePaidEvent,
  StripeInvoicePaymentFailedEvent,
  StripeSubscriptionChangedEvent,
} from '../events';

export type StripeWebhookEvent =
  | StripeCheckoutCompletedEvent
  | StripeSubscriptionChangedEvent
  | StripeInvoicePaidEvent
  | StripeInvoicePaymentFailedEvent;

export interface StripeWebhookConsumer {
  handle(event: StripeWebhookEvent): Promise<void>;
}

@Injectable()
export class StripeWebhookDispatcher {
  private readonly _logger = new Logger(StripeWebhookDispatcher.name);
  readonly #consumers = new Set<StripeWebhookConsumer>();

  public register(consumer: StripeWebhookConsumer): void {
    this.#consumers.add(consumer);
    this._logger.debug(`Registered Stripe webhook consumer: ${consumer.constructor.name}`);
  }

  public async dispatch(event: StripeWebhookEvent): Promise<void> {
    for (const consumer of this.#consumers) {
      await consumer.handle(event);
    }
  }
}
