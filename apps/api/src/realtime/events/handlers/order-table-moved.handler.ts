import { RealtimeEvents, TableStatus } from '@coaster/common';
import { Logger } from '@nestjs/common';
import { EventsHandler, IEventHandler } from '@nestjs/cqrs';
import { OrderTableMovedEvent } from '@coaster/orders';
import { RealtimeService } from '../../services';

@EventsHandler(OrderTableMovedEvent)
export class OrderTableMovedHandler implements IEventHandler<OrderTableMovedEvent> {
  readonly #logger = new Logger(OrderTableMovedHandler.name);

  constructor(private readonly _realtime: RealtimeService) {}

  handle(event: OrderTableMovedEvent) {
    this.#logger.debug(`Catching OrderTableMovedEvent...`);
    this._realtime.publish(event.establishmentId, RealtimeEvents.orderUpdated, event.order);

    if (event.oldTableId) {
      this._realtime.publish(event.establishmentId, RealtimeEvents.tableStatusChanged, {
        id: event.oldTableId,
        status: TableStatus.FREE,
      });
    }

    this._realtime.publish(event.establishmentId, RealtimeEvents.tableStatusChanged, {
      id: event.newTableId,
      status: TableStatus.OCCUPIED,
    });
  }
}
