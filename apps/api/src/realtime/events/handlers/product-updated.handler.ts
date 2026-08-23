import { RealtimeEvents } from '@coaster/common';
import { Logger } from '@nestjs/common';
import { EventsHandler, IEventHandler } from '@nestjs/cqrs';
import { ProductUpdatedEvent } from '@coaster/products';
import { RealtimeService } from '../../services';

@EventsHandler(ProductUpdatedEvent)
export class ProductUpdatedHandler implements IEventHandler<ProductUpdatedEvent> {
  readonly #logger = new Logger(ProductUpdatedHandler.name);

  constructor(private readonly _realtime: RealtimeService) {}

  handle(event: ProductUpdatedEvent) {
    this.#logger.debug(`Catching ProductUpdatedEvent...`);
    this._realtime.publish(event.establishmentId, RealtimeEvents.productUpdated, event.product);
  }
}
