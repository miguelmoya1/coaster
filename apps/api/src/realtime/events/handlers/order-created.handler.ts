import { RealtimeEvents, TableStatus } from '@coaster/common';
import { Logger } from '@nestjs/common';
import { EventsHandler, IEventHandler } from '@nestjs/cqrs';
import { OrderCreatedEvent } from '@coaster/orders';
import { RealtimeService } from '../../services';

@EventsHandler(OrderCreatedEvent)
export class OrderCreatedHandler implements IEventHandler<OrderCreatedEvent> {
  readonly #logger = new Logger(OrderCreatedHandler.name);

  constructor(private readonly _realtime: RealtimeService) {}

  handle(event: OrderCreatedEvent) {
    this.#logger.debug(`Catching OrderCreatedEvent...`);
    this._realtime.publish(event.establishmentId, RealtimeEvents.orderCreated, event.order);

    if (event.tableId) {
      this._realtime.publish(event.establishmentId, RealtimeEvents.tableStatusChanged, {
        id: event.tableId,
        status: TableStatus.OCCUPIED,
      });
    }
  }
}
