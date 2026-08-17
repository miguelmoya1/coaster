import { RealtimeEvents, TableStatus } from '@coaster/common';
import { Logger } from '@nestjs/common';
import { EventsHandler, IEventHandler } from '@nestjs/cqrs';
import { OrderClosedEvent } from '@coaster/orders';
import { RealtimeService } from '../../services';

@EventsHandler(OrderClosedEvent)
export class OrderClosedHandler implements IEventHandler<OrderClosedEvent> {
  readonly #logger = new Logger(OrderClosedHandler.name);

  constructor(private readonly _realtime: RealtimeService) {}

  handle(event: OrderClosedEvent) {
    this.#logger.debug(`Catching OrderClosedEvent...`);
    this._realtime.publish(event.establishmentId, RealtimeEvents.orderClosed, event.order);

    if (event.tableId) {
      this._realtime.publish(event.establishmentId, RealtimeEvents.tableStatusChanged, {
        id: event.tableId,
        status: TableStatus.FREE,
      });
    }
  }
}
