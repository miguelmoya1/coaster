import { RealtimeEvents } from '@coaster/common';
import { OrderAdjustmentsUpdatedEvent } from '@coaster/orders';
import { EventsHandler, IEventHandler } from '@nestjs/cqrs';
import { RealtimeService } from '../../services';

@EventsHandler(OrderAdjustmentsUpdatedEvent)
export class OrderAdjustmentsUpdatedHandler implements IEventHandler<OrderAdjustmentsUpdatedEvent> {
  constructor(private readonly _realtime: RealtimeService) {}

  handle(event: OrderAdjustmentsUpdatedEvent) {
    this._realtime.publish(event.establishmentId, RealtimeEvents.orderAdjustmentsUpdated, {
      orderId: event.orderId,
      adjustments: event.adjustments,
    });
  }
}
