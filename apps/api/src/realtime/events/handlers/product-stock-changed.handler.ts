import { RealtimeEvents } from '@coaster/common';
import { Logger } from '@nestjs/common';
import { EventsHandler, IEventHandler } from '@nestjs/cqrs';
import { ProductStockChangedEvent } from '@coaster/products';
import { RealtimeService } from '../../services';

@EventsHandler(ProductStockChangedEvent)
export class ProductStockChangedHandler implements IEventHandler<ProductStockChangedEvent> {
  readonly #logger = new Logger(ProductStockChangedHandler.name);

  constructor(private readonly _realtime: RealtimeService) {}

  handle(event: ProductStockChangedEvent) {
    this.#logger.debug(`Catching ProductStockChangedEvent...`);
    this._realtime.publish(event.establishmentId, RealtimeEvents.productStockChanged, event.product);
  }
}
