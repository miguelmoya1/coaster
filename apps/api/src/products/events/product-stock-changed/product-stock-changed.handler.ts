import { SocketEvents } from '../../../core';
import { EventsHandler, IEventHandler } from '@nestjs/cqrs';
import { BarGateway } from '../../../websockets';
import { ProductStockChangedEvent } from './product-stock-changed.event';

@EventsHandler(ProductStockChangedEvent)
export class ProductStockChangedHandler implements IEventHandler<ProductStockChangedEvent> {
  constructor(private readonly _barGateway: BarGateway) {}

  handle(event: ProductStockChangedEvent) {
    this._barGateway.server.to(event.barId).emit(SocketEvents.PRODUCT_STOCK_CHANGED, event.product);
  }
}
