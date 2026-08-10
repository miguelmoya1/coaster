import { SocketEvents } from '@coaster/common';
import { Logger } from '@nestjs/common';
import { EventsHandler, IEventHandler } from '@nestjs/cqrs';
import { OrderDeletedEvent } from '@coaster/orders';
import { EstablishmentGateway } from '../../establishment.gateway';

@EventsHandler(OrderDeletedEvent)
export class OrderDeletedHandler implements IEventHandler<OrderDeletedEvent> {
  readonly #logger = new Logger(OrderDeletedHandler.name);

  constructor(private readonly _establishmentGateway: EstablishmentGateway) {}

  handle(event: OrderDeletedEvent) {
    this.#logger.debug(`Catching OrderDeletedEvent...`);
    this._establishmentGateway.server.to(event.establishmentId).emit(SocketEvents.orderDeleted, { id: event.orderId });
  }
}
