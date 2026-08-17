import { RealtimeEvents, TableStatus } from '@coaster/common';
import { Logger } from '@nestjs/common';
import { EventsHandler, IEventHandler } from '@nestjs/cqrs';
import { OrdersMergedEvent } from '@coaster/orders';
import { RealtimeService } from '../../services';

@EventsHandler(OrdersMergedEvent)
export class OrdersMergedHandler implements IEventHandler<OrdersMergedEvent> {
  readonly #logger = new Logger(OrdersMergedHandler.name);

  constructor(private readonly _realtime: RealtimeService) {}

  handle(event: OrdersMergedEvent) {
    this.#logger.debug(`Catching OrdersMergedEvent...`);
    this._realtime.publish(event.establishmentId, RealtimeEvents.orderUpdated, event.primaryOrder);

    for (const source of event.sourceOrders) {
      this._realtime.publish(event.establishmentId, RealtimeEvents.orderCancelled, { id: source.id });
      if (source.tableId) {
        this._realtime.publish(event.establishmentId, RealtimeEvents.tableStatusChanged, {
          id: source.tableId,
          status: TableStatus.FREE,
        });
      }
    }
  }
}
