import { SocketEvents } from '../../../core';
import { EventsHandler, IEventHandler } from '@nestjs/cqrs';
import { BarGateway } from '../../../websockets';
import { ProductCreatedEvent } from './product-created.event';

@EventsHandler(ProductCreatedEvent)
export class ProductCreatedHandler implements IEventHandler<ProductCreatedEvent> {
  constructor(private readonly _barGateway: BarGateway) {}

  handle(event: ProductCreatedEvent) {
    this._barGateway.server.to(event.barId).emit(SocketEvents.PRODUCT_CREATED, event.product);
  }
}
