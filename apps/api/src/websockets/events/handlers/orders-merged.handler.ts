import { SocketEvents, TableStatus } from '@coaster/common';
import { Logger } from '@nestjs/common';
import { EventsHandler, IEventHandler } from '@nestjs/cqrs';
import { OrdersMergedEvent } from '@orders/events';
import { BarGateway } from '../../bar.gateway';

@EventsHandler(OrdersMergedEvent)
export class OrdersMergedHandler implements IEventHandler<OrdersMergedEvent> {
  readonly #logger = new Logger(OrdersMergedHandler.name);

  constructor(private readonly _barGateway: BarGateway) {}

  handle(event: OrdersMergedEvent) {
    this.#logger.debug(`Catching OrdersMergedEvent...`);
    this._barGateway.server.to(event.barId).emit(SocketEvents.orderUpdated, event.primaryOrder);

    for (const source of event.sourceOrders) {
      this._barGateway.server.to(event.barId).emit(SocketEvents.orderCancelled, { id: source.id });
      if (source.tableId) {
        this._barGateway.server.to(event.barId).emit(SocketEvents.tableStatusChanged, {
          id: source.tableId,
          status: TableStatus.FREE,
        });
      }
    }
  }
}
