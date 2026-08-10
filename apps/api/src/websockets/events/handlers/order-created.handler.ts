import { SocketEvents, TableStatus } from '@coaster/common';
import { Logger } from '@nestjs/common';
import { EventsHandler, IEventHandler } from '@nestjs/cqrs';
import { OrderCreatedEvent } from '@coaster/orders';
import { EstablishmentGateway } from '../../establishment.gateway';

@EventsHandler(OrderCreatedEvent)
export class OrderCreatedHandler implements IEventHandler<OrderCreatedEvent> {
  readonly #logger = new Logger(OrderCreatedHandler.name);

  constructor(private readonly _establishmentGateway: EstablishmentGateway) {}

  handle(event: OrderCreatedEvent) {
    this.#logger.debug(`Catching OrderCreatedEvent...`);
    this._establishmentGateway.server.to(event.establishmentId).emit(SocketEvents.orderCreated, event.order);

    if (event.tableId) {
      this._establishmentGateway.server.to(event.establishmentId).emit(SocketEvents.tableStatusChanged, {
        id: event.tableId,
        status: TableStatus.OCCUPIED,
      });
    }
  }
}
