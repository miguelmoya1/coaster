import { RealtimeEvents } from '@coaster/common';
import { Logger } from '@nestjs/common';
import { EventsHandler, IEventHandler } from '@nestjs/cqrs';
import { ProductDeletedEvent } from '@coaster/products';
import { RealtimeService } from '../../services';

@EventsHandler(ProductDeletedEvent)
export class ProductDeletedHandler implements IEventHandler<ProductDeletedEvent> {
  readonly #logger = new Logger(ProductDeletedHandler.name);

  constructor(private readonly _realtime: RealtimeService) {}

  handle(event: ProductDeletedEvent) {
    this.#logger.debug(`Catching ProductDeletedEvent...`);
    this._realtime.publish(event.establishmentId, RealtimeEvents.productDeleted, { id: event.productId });
  }
}
