import { SocketEvents, TableStatus } from '@coaster/common';
import { Logger } from '@nestjs/common';
import { EventsHandler, IEventHandler } from '@nestjs/cqrs';
import { OrderTableMovedEvent } from '@coaster/orders';
import { EstablishmentGateway } from '../../establishment.gateway';

@EventsHandler(OrderTableMovedEvent)
export class OrderTableMovedHandler implements IEventHandler<OrderTableMovedEvent> {
  readonly #logger = new Logger(OrderTableMovedHandler.name);

  constructor(private readonly _establishmentGateway: EstablishmentGateway) {}

  handle(event: OrderTableMovedEvent) {
    this.#logger.debug(`Catching OrderTableMovedEvent...`);
    this._establishmentGateway.server.to(event.establishmentId).emit(SocketEvents.orderUpdated, event.order);

    if (event.oldTableId) {
      this._establishmentGateway.server.to(event.establishmentId).emit(SocketEvents.tableStatusChanged, {
        id: event.oldTableId,
        status: TableStatus.FREE,
      });
    }

    this._establishmentGateway.server.to(event.establishmentId).emit(SocketEvents.tableStatusChanged, {
      id: event.newTableId,
      status: TableStatus.OCCUPIED,
    });
  }
}
