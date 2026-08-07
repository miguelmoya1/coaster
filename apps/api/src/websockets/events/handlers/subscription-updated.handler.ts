import {
  SubscriptionCancelledEvent,
  SubscriptionOverriddenEvent,
  SubscriptionPaymentFailedEvent,
  SubscriptionRenewedEvent,
} from '@coaster/bar-subscription';
import { SocketEvents } from '@coaster/common';
import { Logger } from '@nestjs/common';
import { EventsHandler, IEventHandler } from '@nestjs/cqrs';
import { BarGateway } from '../../bar.gateway';

/**
 * A failed payment moves the bar to PAST_DUE, which is as much a change of what the workspace may
 * do as a cancellation is. Leaving it out kept the clients acting as if they were still paid up
 * until somebody happened to reload.
 */
type SubscriptionEvent =
  | SubscriptionRenewedEvent
  | SubscriptionCancelledEvent
  | SubscriptionPaymentFailedEvent
  | SubscriptionOverriddenEvent;

@EventsHandler(
  SubscriptionRenewedEvent,
  SubscriptionCancelledEvent,
  SubscriptionPaymentFailedEvent,
  SubscriptionOverriddenEvent,
)
export class SubscriptionUpdatedHandler implements IEventHandler<SubscriptionEvent> {
  readonly #logger = new Logger(SubscriptionUpdatedHandler.name);

  constructor(private readonly _barGateway: BarGateway) {}

  handle(event: SubscriptionEvent) {
    this.#logger.debug(`Catching SubscriptionEvent for barId=${event.barId}...`);
    this._barGateway.server.to(event.barId).emit(SocketEvents.subscriptionUpdated, { barId: event.barId });
  }
}
