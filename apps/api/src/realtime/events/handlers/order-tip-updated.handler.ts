import { RealtimeEvents } from '@coaster/common';
import { OrderTipUpdatedEvent } from '@coaster/orders';
import { EventsHandler, IEventHandler } from '@nestjs/cqrs';
import { RealtimeService } from '../../services';

@EventsHandler(OrderTipUpdatedEvent)
export class OrderTipUpdatedHandler implements IEventHandler<OrderTipUpdatedEvent> {
  constructor(private readonly _realtime: RealtimeService) {}

  handle(event: OrderTipUpdatedEvent) {
    this._realtime.publish(event.establishmentId, RealtimeEvents.orderTipUpdated, {
      orderId: event.orderId,
      tipAmount: event.tipAmount,
    });
  }
}
