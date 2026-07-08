import { SocketEvents, TableStatus } from '@coaster/common';
import { Logger } from '@nestjs/common';
import { EventsHandler, IEventHandler } from '@nestjs/cqrs';
import { OrderClosedEvent } from '@orders/events';
import { BarGateway } from '../../bar.gateway';

@EventsHandler(OrderClosedEvent)
export class OrderClosedHandler implements IEventHandler<OrderClosedEvent> {
  readonly #logger = new Logger(OrderClosedHandler.name);

  constructor(private readonly _barGateway: BarGateway) {}

  handle(event: OrderClosedEvent) {
    this.#logger.debug(`Catching OrderClosedEvent...`);
    this._barGateway.server.to(event.barId).emit(SocketEvents.orderClosed, event.order);

    if (event.tableId) {
      this._barGateway.server.to(event.barId).emit(SocketEvents.tableStatusChanged, {
        id: event.tableId,
        status: TableStatus.FREE,
      });
    }
  }
}
