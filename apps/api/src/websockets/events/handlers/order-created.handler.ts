import { Logger } from '@nestjs/common';
import { EventsHandler, IEventHandler } from '@nestjs/cqrs';
import { OrderCreatedEvent } from '@orders/events';
import { SocketEvents } from '../../../core';
import { BarGateway } from '../../bar.gateway';

@EventsHandler(OrderCreatedEvent)
export class OrderCreatedHandler implements IEventHandler<OrderCreatedEvent> {
  readonly #logger = new Logger(OrderCreatedHandler.name);

  constructor(private readonly _barGateway: BarGateway) {}

  handle(event: OrderCreatedEvent) {
    this.#logger.debug(`Catching OrderCreatedEvent...`);
    this._barGateway.server.to(event.barId).emit(SocketEvents.ORDER_CREATED, event.order);

    if (event.tableId) {
      this._barGateway.server.to(event.barId).emit(SocketEvents.TABLE_STATUS_CHANGED, {
        id: event.tableId,
        status: 'OCCUPIED',
      });
    }
  }
}
