import { RealtimeEvents } from '@coaster/common';
import { Logger } from '@nestjs/common';
import { EventsHandler, IEventHandler } from '@nestjs/cqrs';
import { ProductCreatedEvent } from '@coaster/products';
import { RealtimeService } from '../../services';

@EventsHandler(ProductCreatedEvent)
export class ProductCreatedHandler implements IEventHandler<ProductCreatedEvent> {
  readonly #logger = new Logger(ProductCreatedHandler.name);

  constructor(private readonly _realtime: RealtimeService) {}

  handle(event: ProductCreatedEvent) {
    this.#logger.debug(`Catching ProductCreatedEvent...`);
    this._realtime.publish(event.establishmentId, RealtimeEvents.productCreated, event.product);
  }
}
