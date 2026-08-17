import { SocketEvents } from '@coaster/common';
import { Logger } from '@nestjs/common';
import { EventsHandler, IEventHandler } from '@nestjs/cqrs';
import { ProductDeletedEvent } from '@coaster/products';
import { EstablishmentGateway } from '../../establishment.gateway';

@EventsHandler(ProductDeletedEvent)
export class ProductDeletedHandler implements IEventHandler<ProductDeletedEvent> {
  readonly #logger = new Logger(ProductDeletedHandler.name);

  constructor(private readonly _establishmentGateway: EstablishmentGateway) {}

  handle(event: ProductDeletedEvent) {
    this.#logger.debug(`Catching ProductDeletedEvent...`);
    this._establishmentGateway.server
      .to(event.establishmentId)
      .emit(SocketEvents.productDeleted, { id: event.productId });
  }
}
