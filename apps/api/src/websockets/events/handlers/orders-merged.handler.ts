import { TableStatus } from '@coaster/common';
import { Logger } from '@nestjs/common';
import { EventsHandler, IEventHandler } from '@nestjs/cqrs';
import { OrdersMergedEvent } from '@orders/events';
import { SocketEvents } from '../../../core';
import { BarGateway } from '../../bar.gateway';

@EventsHandler(OrdersMergedEvent)
export class OrdersMergedHandler implements IEventHandler<OrdersMergedEvent> {
  readonly #logger = new Logger(OrdersMergedHandler.name);

  constructor(private readonly _barGateway: BarGateway) {}

  handle(event: OrdersMergedEvent) {
    this.#logger.debug(`Catching OrdersMergedEvent...`);
    this._barGateway.server.to(event.barId).emit(SocketEvents.ORDER_UPDATED, event.primaryOrder);

    for (const source of event.sourceOrders) {
      this._barGateway.server.to(event.barId).emit(SocketEvents.ORDER_CANCELLED, { id: source.id });
      if (source.tableId) {
        this._barGateway.server.to(event.barId).emit(SocketEvents.TABLE_STATUS_CHANGED, {
          id: source.tableId,
          status: TableStatus.FREE,
        });
      }
    }
  }
}
