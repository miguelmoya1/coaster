import { SocketEvents } from '@coaster/common';
import { EventsHandler, IEventHandler } from '@nestjs/cqrs';

import { BarGateway } from '../../../core';
import { OrdersMergedEvent } from './orders-merged.event';

@EventsHandler(OrdersMergedEvent)
export class OrdersMergedHandler implements IEventHandler<OrdersMergedEvent> {
  constructor(private readonly _barGateway: BarGateway) {}

  handle(event: OrdersMergedEvent) {
    this._barGateway.server.to(event.barId).emit(SocketEvents.ORDER_UPDATED, event.primaryOrder);

    for (const source of event.sourceOrders) {
      this._barGateway.server.to(event.barId).emit(SocketEvents.ORDER_CANCELLED, { id: source.id });
      if (source.tableId) {
        this._barGateway.server.to(event.barId).emit(SocketEvents.TABLE_STATUS_CHANGED, {
          id: source.tableId,
          status: 'FREE',
        });
      }
    }
  }
}
