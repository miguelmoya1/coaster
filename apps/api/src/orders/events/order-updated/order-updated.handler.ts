import { SocketEvents } from '@coaster/common';
import { EventsHandler, IEventHandler } from '@nestjs/cqrs';
import { BarGateway } from '../../../core';
import { OrderUpdatedEvent } from './order-updated.event';

@EventsHandler(OrderUpdatedEvent)
export class OrderUpdatedHandler implements IEventHandler<OrderUpdatedEvent> {
  constructor(private readonly _barGateway: BarGateway) {}

  handle(event: OrderUpdatedEvent) {
    this._barGateway.server.to(event.barId).emit(SocketEvents.ORDER_UPDATED, event.order);
  }
}
