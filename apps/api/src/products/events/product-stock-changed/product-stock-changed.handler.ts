import { EventsHandler, IEventHandler } from '@nestjs/cqrs';
import { ProductStockChangedEvent } from './product-stock-changed.event';
import { BarGateway } from '../../../core';
import { SocketEvents } from '@coaster/common';

@EventsHandler(ProductStockChangedEvent)
export class ProductStockChangedHandler implements IEventHandler<ProductStockChangedEvent> {
  constructor(private readonly _barGateway: BarGateway) {}

  handle(event: ProductStockChangedEvent) {
    this._barGateway.server.to(event.barId).emit(SocketEvents.PRODUCT_STOCK_CHANGED, event.product);
  }
}
