import { SocketEvents } from '../../../core';
import { EventsHandler, IEventHandler } from '@nestjs/cqrs';
import { BarGateway } from '../../../core';
import { OrderCancelledEvent } from './order-cancelled.event';

@EventsHandler(OrderCancelledEvent)
export class OrderCancelledHandler implements IEventHandler<OrderCancelledEvent> {
  constructor(private readonly _barGateway: BarGateway) {}

  handle(event: OrderCancelledEvent) {
    this._barGateway.server.to(event.barId).emit(SocketEvents.ORDER_CANCELLED, event.order);

    if (event.tableId) {
      this._barGateway.server.to(event.barId).emit(SocketEvents.TABLE_STATUS_CHANGED, {
        id: event.tableId,
        status: 'FREE',
      });
    }
  }
}
