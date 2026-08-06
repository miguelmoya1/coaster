import { SubscriptionCancelledEvent, SubscriptionRenewedEvent } from '@coaster/bar-subscription';
import { SocketEvents } from '@coaster/common';
import { Logger } from '@nestjs/common';
import { EventsHandler, IEventHandler } from '@nestjs/cqrs';
import { BarGateway } from '../../bar.gateway';

type SubscriptionEvent = SubscriptionRenewedEvent | SubscriptionCancelledEvent;

@EventsHandler(SubscriptionRenewedEvent, SubscriptionCancelledEvent)
export class SubscriptionUpdatedHandler implements IEventHandler<SubscriptionEvent> {
  readonly #logger = new Logger(SubscriptionUpdatedHandler.name);

  constructor(private readonly _barGateway: BarGateway) {}

  handle(event: SubscriptionEvent) {
    this.#logger.debug(`Catching SubscriptionEvent for barId=${event.barId}...`);
    this._barGateway.server.to(event.barId).emit(SocketEvents.subscriptionUpdated, { barId: event.barId });
  }
}
