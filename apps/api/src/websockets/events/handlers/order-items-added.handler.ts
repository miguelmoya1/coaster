import { SocketEvents } from '@coaster/common';
import { Logger } from '@nestjs/common';
import { EventsHandler, IEventHandler } from '@nestjs/cqrs';
import { OrderItemsAddedEvent } from '@orders/events';
import { BarGateway } from '../../bar.gateway';

@EventsHandler(OrderItemsAddedEvent)
export class OrderItemsAddedHandler implements IEventHandler<OrderItemsAddedEvent> {
  readonly #logger = new Logger(OrderItemsAddedHandler.name);

  constructor(private readonly _barGateway: BarGateway) {}

  handle(event: OrderItemsAddedEvent) {
    this.#logger.debug(`Catching OrderItemsAddedEvent...`);
    this._barGateway.server.to(event.barId).emit(SocketEvents.orderItemAdded, event.order);
  }
}
