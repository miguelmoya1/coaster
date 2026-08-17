import { SocketEvents } from '@coaster/common';
import { Logger } from '@nestjs/common';
import { EventsHandler, IEventHandler } from '@nestjs/cqrs';
import { OrderItemsAddedEvent } from '@coaster/orders';
import { EstablishmentGateway } from '../../establishment.gateway';

@EventsHandler(OrderItemsAddedEvent)
export class OrderItemsAddedHandler implements IEventHandler<OrderItemsAddedEvent> {
  readonly #logger = new Logger(OrderItemsAddedHandler.name);

  constructor(private readonly _establishmentGateway: EstablishmentGateway) {}

  handle(event: OrderItemsAddedEvent) {
    this.#logger.debug(`Catching OrderItemsAddedEvent...`);
    this._establishmentGateway.server.to(event.establishmentId).emit(SocketEvents.orderItemAdded, event.order);
  }
}
