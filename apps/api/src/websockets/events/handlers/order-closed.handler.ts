import { SocketEvents, TableStatus } from '@coaster/common';
import { Logger } from '@nestjs/common';
import { EventsHandler, IEventHandler } from '@nestjs/cqrs';
import { OrderClosedEvent } from '@coaster/orders';
import { EstablishmentGateway } from '../../establishment.gateway';

@EventsHandler(OrderClosedEvent)
export class OrderClosedHandler implements IEventHandler<OrderClosedEvent> {
  readonly #logger = new Logger(OrderClosedHandler.name);

  constructor(private readonly _establishmentGateway: EstablishmentGateway) {}

  handle(event: OrderClosedEvent) {
    this.#logger.debug(`Catching OrderClosedEvent...`);
    this._establishmentGateway.server.to(event.establishmentId).emit(SocketEvents.orderClosed, event.order);

    if (event.tableId) {
      this._establishmentGateway.server.to(event.establishmentId).emit(SocketEvents.tableStatusChanged, {
        id: event.tableId,
        status: TableStatus.FREE,
      });
    }
  }
}
