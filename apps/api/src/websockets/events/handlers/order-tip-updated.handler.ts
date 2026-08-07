import { SocketEvents } from '@coaster/common';
import { OrderTipUpdatedEvent } from '@coaster/orders';
import { EventsHandler, IEventHandler } from '@nestjs/cqrs';
import { BarGateway } from '../../bar.gateway';

@EventsHandler(OrderTipUpdatedEvent)
export class OrderTipUpdatedHandler implements IEventHandler<OrderTipUpdatedEvent> {
  constructor(private readonly _barGateway: BarGateway) {}

  handle(event: OrderTipUpdatedEvent) {
    this._barGateway.server.to(event.barId).emit(SocketEvents.orderTipUpdated, {
      orderId: event.orderId,
      tipAmount: event.tipAmount,
    });
  }
}
