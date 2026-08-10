import {
  SubscriptionCancelledEvent,
  SubscriptionOverriddenEvent,
  SubscriptionPaymentFailedEvent,
  SubscriptionRenewedEvent,
} from '@coaster/establishment-subscription';
import { SocketEvents } from '@coaster/common';
import { Logger } from '@nestjs/common';
import { EventsHandler, IEventHandler } from '@nestjs/cqrs';
import { EstablishmentGateway } from '../../establishment.gateway';

/**
 * A failed payment moves the establishment to PAST_DUE, which is as much a change of what the workspace may
 * do as a cancellation is. Leaving it out kept the clients acting as if they were still paid up
 * until somebody happened to reload.
 */
type SubscriptionEvent =
  SubscriptionRenewedEvent | SubscriptionCancelledEvent | SubscriptionPaymentFailedEvent | SubscriptionOverriddenEvent;

@EventsHandler(
  SubscriptionRenewedEvent,
  SubscriptionCancelledEvent,
  SubscriptionPaymentFailedEvent,
  SubscriptionOverriddenEvent,
)
export class SubscriptionUpdatedHandler implements IEventHandler<SubscriptionEvent> {
  readonly #logger = new Logger(SubscriptionUpdatedHandler.name);

  constructor(private readonly _establishmentGateway: EstablishmentGateway) {}

  handle(event: SubscriptionEvent) {
    this.#logger.debug(`Catching SubscriptionEvent for establishmentId=${event.establishmentId}...`);
    this._establishmentGateway.server
      .to(event.establishmentId)
      .emit(SocketEvents.subscriptionUpdated, { establishmentId: event.establishmentId });
  }
}
