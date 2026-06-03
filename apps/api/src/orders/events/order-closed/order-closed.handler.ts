import { SocketEvents } from '../../../core';
import { EventsHandler, IEventHandler } from '@nestjs/cqrs';
import { BarGateway } from '../../../core';
import { OrderClosedEvent } from './order-closed.event';

@EventsHandler(OrderClosedEvent)
export class OrderClosedHandler implements IEventHandler<OrderClosedEvent> {
  constructor(private readonly _barGateway: BarGateway) {}

  handle(event: OrderClosedEvent) {
    this._barGateway.server.to(event.barId).emit(SocketEvents.ORDER_CLOSED, event.order);

    if (event.tableId) {
      this._barGateway.server.to(event.barId).emit(SocketEvents.TABLE_STATUS_CHANGED, {
        id: event.tableId,
        status: 'FREE',
      });
    }
  }
}
