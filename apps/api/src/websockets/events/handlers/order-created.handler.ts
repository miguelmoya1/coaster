import { SocketEvents, TableStatus } from '@coaster/common';
import { Logger } from '@nestjs/common';
import { EventsHandler, IEventHandler } from '@nestjs/cqrs';
import { OrderCreatedEvent } from '@orders/events';
import { BarGateway } from '../../bar.gateway';

@EventsHandler(OrderCreatedEvent)
export class OrderCreatedHandler implements IEventHandler<OrderCreatedEvent> {
  readonly #logger = new Logger(OrderCreatedHandler.name);

  constructor(private readonly _barGateway: BarGateway) {}

  handle(event: OrderCreatedEvent) {
    this.#logger.debug(`Catching OrderCreatedEvent...`);
    this._barGateway.server.to(event.barId).emit(SocketEvents.orderCreated, event.order);

    if (event.tableId) {
      this._barGateway.server.to(event.barId).emit(SocketEvents.tableStatusChanged, {
        id: event.tableId,
        status: TableStatus.OCCUPIED,
      });
    }
  }
}
