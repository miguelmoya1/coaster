import { SocketEvents } from '@coaster/common';
import { OrderAdjustmentsUpdatedEvent } from '@coaster/orders';
import { EventsHandler, IEventHandler } from '@nestjs/cqrs';
import { EstablishmentGateway } from '../../establishment.gateway';

@EventsHandler(OrderAdjustmentsUpdatedEvent)
export class OrderAdjustmentsUpdatedHandler implements IEventHandler<OrderAdjustmentsUpdatedEvent> {
  constructor(private readonly _establishmentGateway: EstablishmentGateway) {}

  handle(event: OrderAdjustmentsUpdatedEvent) {
    this._establishmentGateway.server.to(event.establishmentId).emit(SocketEvents.orderAdjustmentsUpdated, {
      orderId: event.orderId,
      adjustments: event.adjustments,
    });
  }
}
