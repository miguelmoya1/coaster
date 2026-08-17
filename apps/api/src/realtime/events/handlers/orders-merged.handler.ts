import { SocketEvents, TableStatus } from '@coaster/common';
import { Logger } from '@nestjs/common';
import { EventsHandler, IEventHandler } from '@nestjs/cqrs';
import { OrdersMergedEvent } from '@coaster/orders';
import { EstablishmentGateway } from '../../establishment.gateway';

@EventsHandler(OrdersMergedEvent)
export class OrdersMergedHandler implements IEventHandler<OrdersMergedEvent> {
  readonly #logger = new Logger(OrdersMergedHandler.name);

  constructor(private readonly _establishmentGateway: EstablishmentGateway) {}

  handle(event: OrdersMergedEvent) {
    this.#logger.debug(`Catching OrdersMergedEvent...`);
    this._establishmentGateway.server.to(event.establishmentId).emit(SocketEvents.orderUpdated, event.primaryOrder);

    for (const source of event.sourceOrders) {
      this._establishmentGateway.server.to(event.establishmentId).emit(SocketEvents.orderCancelled, { id: source.id });
      if (source.tableId) {
        this._establishmentGateway.server.to(event.establishmentId).emit(SocketEvents.tableStatusChanged, {
          id: source.tableId,
          status: TableStatus.FREE,
        });
      }
    }
  }
}
