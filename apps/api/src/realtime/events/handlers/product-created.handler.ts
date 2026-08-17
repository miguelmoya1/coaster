import { SocketEvents } from '@coaster/common';
import { Logger } from '@nestjs/common';
import { EventsHandler, IEventHandler } from '@nestjs/cqrs';
import { ProductCreatedEvent } from '@coaster/products';
import { EstablishmentGateway } from '../../establishment.gateway';

@EventsHandler(ProductCreatedEvent)
export class ProductCreatedHandler implements IEventHandler<ProductCreatedEvent> {
  readonly #logger = new Logger(ProductCreatedHandler.name);

  constructor(private readonly _establishmentGateway: EstablishmentGateway) {}

  handle(event: ProductCreatedEvent) {
    this.#logger.debug(`Catching ProductCreatedEvent...`);
    this._establishmentGateway.server.to(event.establishmentId).emit(SocketEvents.productCreated, event.product);
  }
}
