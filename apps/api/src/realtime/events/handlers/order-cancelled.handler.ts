import { RealtimeEvents, TableStatus } from '@coaster/common';
import { Logger } from '@nestjs/common';
import { EventsHandler, IEventHandler } from '@nestjs/cqrs';
import { OrderCancelledEvent } from '@coaster/orders';
import { RealtimeService } from '../../services';

@EventsHandler(OrderCancelledEvent)
export class OrderCancelledHandler implements IEventHandler<OrderCancelledEvent> {
  readonly #logger = new Logger(OrderCancelledHandler.name);

  constructor(private readonly _realtime: RealtimeService) {}

  handle(event: OrderCancelledEvent) {
    this.#logger.debug(`Catching OrderCancelledEvent...`);
    this._realtime.publish(event.establishmentId, RealtimeEvents.orderCancelled, event.order);

    if (event.tableId) {
      this._realtime.publish(event.establishmentId, RealtimeEvents.tableStatusChanged, {
        id: event.tableId,
        status: TableStatus.FREE,
      });
    }
  }
}
