import { EventsHandler, IEventHandler } from '@nestjs/cqrs';
import { OrderUpdatedEvent } from './order-updated.event';
import { BarGateway } from '../../../core';
import { SocketEvents } from '@coaster/common';

@EventsHandler(OrderUpdatedEvent)
export class OrderUpdatedHandler implements IEventHandler<OrderUpdatedEvent> {
  constructor(private readonly _barGateway: BarGateway) {}

  handle(event: OrderUpdatedEvent) {
    this._barGateway.server.to(event.barId).emit(SocketEvents.ORDER_UPDATED, event.order);
  }
}
