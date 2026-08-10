import { SocketEvents } from '@coaster/common';
import { Logger } from '@nestjs/common';
import { EventsHandler, IEventHandler } from '@nestjs/cqrs';
import { ProductStockChangedEvent } from '@coaster/products';
import { EstablishmentGateway } from '../../establishment.gateway';

@EventsHandler(ProductStockChangedEvent)
export class ProductStockChangedHandler implements IEventHandler<ProductStockChangedEvent> {
  readonly #logger = new Logger(ProductStockChangedHandler.name);

  constructor(private readonly _establishmentGateway: EstablishmentGateway) {}

  handle(event: ProductStockChangedEvent) {
    this.#logger.debug(`Catching ProductStockChangedEvent...`);
    this._establishmentGateway.server.to(event.establishmentId).emit(SocketEvents.productStockChanged, event.product);
  }
}
