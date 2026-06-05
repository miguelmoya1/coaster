import { Logger } from '@nestjs/common';
import { EventsHandler, IEventHandler } from '@nestjs/cqrs';
import { OrderClosedEvent } from '../../../../events';
import { SocketEvents } from '../../../../core';
import { BarGateway } from '../../../bar.gateway';

@EventsHandler(OrderClosedEvent)
export class OrderClosedHandler implements IEventHandler<OrderClosedEvent> {
  readonly #logger = new Logger(OrderClosedHandler.name);

  constructor(private readonly _barGateway: BarGateway) {}

  handle(event: OrderClosedEvent) {
    this.#logger.debug(`Catching OrderClosedEvent...`);
    this._barGateway.server.to(event.barId).emit(SocketEvents.ORDER_CLOSED, event.order);

    if (event.tableId) {
      this._barGateway.server.to(event.barId).emit(SocketEvents.TABLE_STATUS_CHANGED, {
        id: event.tableId,
        status: 'FREE',
      });
    }
  }
}
