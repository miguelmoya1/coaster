import { SocketEvents, TableStatus } from '@coaster/common';
import { Logger } from '@nestjs/common';
import { EventsHandler, IEventHandler } from '@nestjs/cqrs';
import { OrderTableMovedEvent } from '@orders/events';
import { BarGateway } from '../../bar.gateway';

@EventsHandler(OrderTableMovedEvent)
export class OrderTableMovedHandler implements IEventHandler<OrderTableMovedEvent> {
  readonly #logger = new Logger(OrderTableMovedHandler.name);

  constructor(private readonly _barGateway: BarGateway) {}

  handle(event: OrderTableMovedEvent) {
    this.#logger.debug(`Catching OrderTableMovedEvent...`);
    this._barGateway.server.to(event.barId).emit(SocketEvents.orderUpdated, event.order);

    if (event.oldTableId) {
      this._barGateway.server.to(event.barId).emit(SocketEvents.tableStatusChanged, {
        id: event.oldTableId,
        status: TableStatus.FREE,
      });
    }

    this._barGateway.server.to(event.barId).emit(SocketEvents.tableStatusChanged, {
      id: event.newTableId,
      status: TableStatus.OCCUPIED,
    });
  }
}
