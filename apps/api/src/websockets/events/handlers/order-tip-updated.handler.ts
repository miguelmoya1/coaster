import { SocketEvents } from '@coaster/common';
import { OrderTipUpdatedEvent } from '@coaster/orders';
import { EventsHandler, IEventHandler } from '@nestjs/cqrs';
import { EstablishmentGateway } from '../../establishment.gateway';

@EventsHandler(OrderTipUpdatedEvent)
export class OrderTipUpdatedHandler implements IEventHandler<OrderTipUpdatedEvent> {
  constructor(private readonly _establishmentGateway: EstablishmentGateway) {}

  handle(event: OrderTipUpdatedEvent) {
    this._establishmentGateway.server.to(event.establishmentId).emit(SocketEvents.orderTipUpdated, {
      orderId: event.orderId,
      tipAmount: event.tipAmount,
    });
  }
}
