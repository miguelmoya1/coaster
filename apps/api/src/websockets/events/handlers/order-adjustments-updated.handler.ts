import { SocketEvents } from '@coaster/common';
import { OrderAdjustmentsUpdatedEvent } from '@coaster/orders';
import { EventsHandler, IEventHandler } from '@nestjs/cqrs';
import { BarGateway } from '../../bar.gateway';

@EventsHandler(OrderAdjustmentsUpdatedEvent)
export class OrderAdjustmentsUpdatedHandler implements IEventHandler<OrderAdjustmentsUpdatedEvent> {
  constructor(private readonly _barGateway: BarGateway) {}

  handle(event: OrderAdjustmentsUpdatedEvent) {
    this._barGateway.server.to(event.barId).emit(SocketEvents.orderAdjustmentsUpdated, {
      orderId: event.orderId,
      adjustments: event.adjustments,
    });
  }
}
