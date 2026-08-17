import { SocketEvents, TableStatus } from '@coaster/common';
import { Logger } from '@nestjs/common';
import { EventsHandler, IEventHandler } from '@nestjs/cqrs';
import { OrderCancelledEvent } from '@coaster/orders';
import { EstablishmentGateway } from '../../establishment.gateway';

@EventsHandler(OrderCancelledEvent)
export class OrderCancelledHandler implements IEventHandler<OrderCancelledEvent> {
  readonly #logger = new Logger(OrderCancelledHandler.name);

  constructor(private readonly _establishmentGateway: EstablishmentGateway) {}

  handle(event: OrderCancelledEvent) {
    this.#logger.debug(`Catching OrderCancelledEvent...`);
    this._establishmentGateway.server.to(event.establishmentId).emit(SocketEvents.orderCancelled, event.order);

    if (event.tableId) {
      this._establishmentGateway.server.to(event.establishmentId).emit(SocketEvents.tableStatusChanged, {
        id: event.tableId,
        status: TableStatus.FREE,
      });
    }
  }
}
