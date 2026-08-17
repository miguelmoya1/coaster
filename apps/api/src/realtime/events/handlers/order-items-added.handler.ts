import { RealtimeEvents } from '@coaster/common';
import { Logger } from '@nestjs/common';
import { EventsHandler, IEventHandler } from '@nestjs/cqrs';
import { OrderItemsAddedEvent } from '@coaster/orders';
import { RealtimeService } from '../../services';

@EventsHandler(OrderItemsAddedEvent)
export class OrderItemsAddedHandler implements IEventHandler<OrderItemsAddedEvent> {
  readonly #logger = new Logger(OrderItemsAddedHandler.name);

  constructor(private readonly _realtime: RealtimeService) {}

  handle(event: OrderItemsAddedEvent) {
    this.#logger.debug(`Catching OrderItemsAddedEvent...`);
    this._realtime.publish(event.establishmentId, RealtimeEvents.orderItemAdded, event.order);
  }
}
