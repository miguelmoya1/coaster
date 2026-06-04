import { Logger } from '@nestjs/common';
import { EventsHandler, IEventHandler } from '@nestjs/cqrs';
import { ProductUpdatedEvent } from '../../../../events';
import { SocketEvents } from '../../../../core';
import { BarGateway } from '../../../bar.gateway';

@EventsHandler(ProductUpdatedEvent)
export class ProductUpdatedHandler implements IEventHandler<ProductUpdatedEvent> {
  readonly #logger = new Logger(ProductUpdatedHandler.name);

  constructor(private readonly _barGateway: BarGateway) {}

  handle(event: ProductUpdatedEvent) {
    this.#logger.debug(`Catching ProductUpdatedEvent...`);
    this._barGateway.server.to(event.barId).emit(SocketEvents.PRODUCT_UPDATED, event.product);
  }
}
