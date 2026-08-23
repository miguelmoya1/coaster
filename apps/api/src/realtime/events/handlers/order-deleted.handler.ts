import { RealtimeEvents } from '@coaster/common';
import { Logger } from '@nestjs/common';
import { EventsHandler, IEventHandler } from '@nestjs/cqrs';
import { OrderDeletedEvent } from '@coaster/orders';
import { RealtimeService } from '../../services';

@EventsHandler(OrderDeletedEvent)
export class OrderDeletedHandler implements IEventHandler<OrderDeletedEvent> {
  readonly #logger = new Logger(OrderDeletedHandler.name);

  constructor(private readonly _realtime: RealtimeService) {}

  handle(event: OrderDeletedEvent) {
    this.#logger.debug(`Catching OrderDeletedEvent...`);
    this._realtime.publish(event.establishmentId, RealtimeEvents.orderDeleted, { id: event.orderId });
  }
}
