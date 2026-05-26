import { EventsHandler, IEventHandler } from '@nestjs/cqrs';
import { OrderItemsAddedEvent } from './order-items-added.event';
import { BarGateway } from '../../../core';
import { SocketEvents } from '@coaster/common';

@EventsHandler(OrderItemsAddedEvent)
export class OrderItemsAddedHandler implements IEventHandler<OrderItemsAddedEvent> {
  constructor(private readonly _barGateway: BarGateway) {}

  handle(event: OrderItemsAddedEvent) {
    this._barGateway.server.to(event.barId).emit(SocketEvents.ORDER_ITEM_ADDED, event.order);
  }
}
