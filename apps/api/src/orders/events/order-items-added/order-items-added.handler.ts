import { SocketEvents } from '../../../core';
import { EventsHandler, IEventHandler } from '@nestjs/cqrs';
import { BarGateway } from '../../../websockets';
import { OrderItemsAddedEvent } from './order-items-added.event';

@EventsHandler(OrderItemsAddedEvent)
export class OrderItemsAddedHandler implements IEventHandler<OrderItemsAddedEvent> {
  constructor(private readonly _barGateway: BarGateway) {}

  handle(event: OrderItemsAddedEvent) {
    this._barGateway.server.to(event.barId).emit(SocketEvents.ORDER_ITEM_ADDED, event.order);
  }
}
