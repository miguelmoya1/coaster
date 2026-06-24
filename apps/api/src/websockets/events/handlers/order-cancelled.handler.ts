import { Logger } from '@nestjs/common';
import { EventsHandler, IEventHandler } from '@nestjs/cqrs';
import { OrderCancelledEvent } from '@orders/events';
import { SocketEvents } from '../../../core';
import { BarGateway } from '../../bar.gateway';

@EventsHandler(OrderCancelledEvent)
export class OrderCancelledHandler implements IEventHandler<OrderCancelledEvent> {
  readonly #logger = new Logger(OrderCancelledHandler.name);

  constructor(private readonly _barGateway: BarGateway) {}

  handle(event: OrderCancelledEvent) {
    this.#logger.debug(`Catching OrderCancelledEvent...`);
    this._barGateway.server.to(event.barId).emit(SocketEvents.ORDER_CANCELLED, event.order);

    if (event.tableId) {
      this._barGateway.server.to(event.barId).emit(SocketEvents.TABLE_STATUS_CHANGED, {
        id: event.tableId,
        status: 'FREE',
      });
    }
  }
}
