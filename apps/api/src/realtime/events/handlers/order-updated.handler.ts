import { RealtimeEvents } from '@coaster/common';
import { Logger } from '@nestjs/common';
import { EventsHandler, IEventHandler } from '@nestjs/cqrs';
import { OrderUpdatedEvent } from '@coaster/orders';
import { RealtimeService } from '../../services';

@EventsHandler(OrderUpdatedEvent)
export class OrderUpdatedHandler implements IEventHandler<OrderUpdatedEvent> {
  readonly #logger = new Logger(OrderUpdatedHandler.name);

  constructor(private readonly _realtime: RealtimeService) {}

  handle(event: OrderUpdatedEvent) {
    this.#logger.debug(`Catching OrderUpdatedEvent...`);
    this._realtime.publish(event.establishmentId, RealtimeEvents.orderUpdated, event.order);
  }
}
