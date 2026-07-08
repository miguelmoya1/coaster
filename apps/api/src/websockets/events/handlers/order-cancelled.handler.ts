import { SocketEvents, TableStatus } from '@coaster/common';
import { Logger } from '@nestjs/common';
import { EventsHandler, IEventHandler } from '@nestjs/cqrs';
import { OrderCancelledEvent } from '@orders/events';
import { BarGateway } from '../../bar.gateway';

@EventsHandler(OrderCancelledEvent)
export class OrderCancelledHandler implements IEventHandler<OrderCancelledEvent> {
  readonly #logger = new Logger(OrderCancelledHandler.name);

  constructor(private readonly _barGateway: BarGateway) {}

  handle(event: OrderCancelledEvent) {
    this.#logger.debug(`Catching OrderCancelledEvent...`);
    this._barGateway.server.to(event.barId).emit(SocketEvents.orderCancelled, event.order);

    if (event.tableId) {
      this._barGateway.server.to(event.barId).emit(SocketEvents.tableStatusChanged, {
        id: event.tableId,
        status: TableStatus.FREE,
      });
    }
  }
}
