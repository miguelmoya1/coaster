import { SocketEvents } from '@coaster/common';
import { Logger } from '@nestjs/common';
import { EventsHandler, IEventHandler } from '@nestjs/cqrs';
import { ProductUpdatedEvent } from '@coaster/products';
import { EstablishmentGateway } from '../../establishment.gateway';

@EventsHandler(ProductUpdatedEvent)
export class ProductUpdatedHandler implements IEventHandler<ProductUpdatedEvent> {
  readonly #logger = new Logger(ProductUpdatedHandler.name);

  constructor(private readonly _establishmentGateway: EstablishmentGateway) {}

  handle(event: ProductUpdatedEvent) {
    this.#logger.debug(`Catching ProductUpdatedEvent...`);
    this._establishmentGateway.server.to(event.establishmentId).emit(SocketEvents.productUpdated, event.product);
  }
}
