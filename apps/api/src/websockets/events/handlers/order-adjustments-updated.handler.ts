import { SocketEvents } from '@coaster/common';
import { EventsHandler, IEventHandler } from '@nestjs/cqrs';
import { OrderAdjustmentsUpdatedEvent } from '../../../orders/events/impl/order-adjustments-updated.event';
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
