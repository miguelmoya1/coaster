import { Logger } from '@nestjs/common';
import { EventsHandler, IEventHandler } from '@nestjs/cqrs';
import { ProductDeletedEvent } from '@products/events';
import { SocketEvents } from '../../../core';
import { BarGateway } from '../../bar.gateway';

@EventsHandler(ProductDeletedEvent)
export class ProductDeletedHandler implements IEventHandler<ProductDeletedEvent> {
  readonly #logger = new Logger(ProductDeletedHandler.name);

  constructor(private readonly _barGateway: BarGateway) {}

  handle(event: ProductDeletedEvent) {
    this.#logger.debug(`Catching ProductDeletedEvent...`);
    this._barGateway.server.to(event.barId).emit(SocketEvents.PRODUCT_DELETED, { id: event.productId });
  }
}
