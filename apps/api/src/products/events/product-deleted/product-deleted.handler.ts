import { SocketEvents } from '../../../core';
import { EventsHandler, IEventHandler } from '@nestjs/cqrs';
import { BarGateway } from '../../../core';
import { ProductDeletedEvent } from './product-deleted.event';

@EventsHandler(ProductDeletedEvent)
export class ProductDeletedHandler implements IEventHandler<ProductDeletedEvent> {
  constructor(private readonly _barGateway: BarGateway) {}

  handle(event: ProductDeletedEvent) {
    this._barGateway.server.to(event.barId).emit(SocketEvents.PRODUCT_DELETED, { id: event.productId });
  }
}
