import { Logger } from '@nestjs/common';
import { EventsHandler, IEventHandler } from '@nestjs/cqrs';
import { ProductStockChangedEvent } from '@products/events';
import { SocketEvents } from '../../../../core';
import { BarGateway } from '../../../bar.gateway';

@EventsHandler(ProductStockChangedEvent)
export class ProductStockChangedHandler implements IEventHandler<ProductStockChangedEvent> {
  readonly #logger = new Logger(ProductStockChangedHandler.name);

  constructor(private readonly _barGateway: BarGateway) {}

  handle(event: ProductStockChangedEvent) {
    this.#logger.debug(`Catching ProductStockChangedEvent...`);
    this._barGateway.server.to(event.barId).emit(SocketEvents.PRODUCT_STOCK_CHANGED, event.product);
  }
}
