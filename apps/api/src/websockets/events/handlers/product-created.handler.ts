import { SocketEvents } from '@coaster/common';
import { Logger } from '@nestjs/common';
import { EventsHandler, IEventHandler } from '@nestjs/cqrs';
import { ProductCreatedEvent } from '@products/events';
import { BarGateway } from '../../bar.gateway';

@EventsHandler(ProductCreatedEvent)
export class ProductCreatedHandler implements IEventHandler<ProductCreatedEvent> {
  readonly #logger = new Logger(ProductCreatedHandler.name);

  constructor(private readonly _barGateway: BarGateway) {}

  handle(event: ProductCreatedEvent) {
    this.#logger.debug(`Catching ProductCreatedEvent...`);
    this._barGateway.server.to(event.barId).emit(SocketEvents.productCreated, event.product);
  }
}
