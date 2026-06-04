import { Logger } from '@nestjs/common';
import { EventsHandler, IEventHandler } from '@nestjs/cqrs';
import { OrderTableMovedEvent } from '../../../../events';
import { SocketEvents } from '../../../../core';
import { BarGateway } from '../../../bar.gateway';

@EventsHandler(OrderTableMovedEvent)
export class OrderTableMovedHandler implements IEventHandler<OrderTableMovedEvent> {
  readonly #logger = new Logger(OrderTableMovedHandler.name);

  constructor(private readonly _barGateway: BarGateway) {}

  handle(event: OrderTableMovedEvent) {
    this.#logger.debug(`Catching OrderTableMovedEvent...`);
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
