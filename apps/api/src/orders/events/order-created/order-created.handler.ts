import { SocketEvents } from '../../../core';
import { EventsHandler, IEventHandler } from '@nestjs/cqrs';
import { BarGateway } from '../../../websockets';
import { OrderCreatedEvent } from './order-created.event';

@EventsHandler(OrderCreatedEvent)
export class OrderCreatedHandler implements IEventHandler<OrderCreatedEvent> {
  constructor(private readonly _barGateway: BarGateway) {}

  handle(event: OrderCreatedEvent) {
    this._barGateway.server.to(event.barId).emit(SocketEvents.ORDER_CREATED, event.order);

    if (event.tableId) {
      this._barGateway.server.to(event.barId).emit(SocketEvents.TABLE_STATUS_CHANGED, {
        id: event.tableId,
        status: 'OCCUPIED',
      });
    }
  }
}
