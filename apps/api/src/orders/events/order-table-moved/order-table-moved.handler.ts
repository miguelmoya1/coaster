import { SocketEvents } from '@coaster/common';
import { EventsHandler, IEventHandler } from '@nestjs/cqrs';
import { BarGateway } from '../../../core';
import { OrderTableMovedEvent } from './order-table-moved.event';

@EventsHandler(OrderTableMovedEvent)
export class OrderTableMovedHandler implements IEventHandler<OrderTableMovedEvent> {
  constructor(private readonly _barGateway: BarGateway) {}

  handle(event: OrderTableMovedEvent) {
    this._barGateway.server.to(event.barId).emit(SocketEvents.ORDER_UPDATED, event.order);

    if (event.oldTableId) {
      this._barGateway.server.to(event.barId).emit(SocketEvents.TABLE_STATUS_CHANGED, {
        id: event.oldTableId,
        status: 'FREE',
      });
    }

    this._barGateway.server.to(event.barId).emit(SocketEvents.TABLE_STATUS_CHANGED, {
      id: event.newTableId,
      status: 'OCCUPIED',
    });
  }
}
