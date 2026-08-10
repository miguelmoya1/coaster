import { SocketEvents } from '@coaster/common';
import { Logger } from '@nestjs/common';
import { EventsHandler, IEventHandler } from '@nestjs/cqrs';
import { OrderUpdatedEvent } from '@coaster/orders';
import { EstablishmentGateway } from '../../establishment.gateway';

@EventsHandler(OrderUpdatedEvent)
export class OrderUpdatedHandler implements IEventHandler<OrderUpdatedEvent> {
  readonly #logger = new Logger(OrderUpdatedHandler.name);

  constructor(private readonly _establishmentGateway: EstablishmentGateway) {}

  handle(event: OrderUpdatedEvent) {
    this.#logger.debug(`Catching OrderUpdatedEvent...`);
    this._establishmentGateway.server.to(event.establishmentId).emit(SocketEvents.orderUpdated, event.order);
  }
}
