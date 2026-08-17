import { CategoryUpdatedEvent } from '@coaster/categories';
import { RealtimeEvents } from '@coaster/common';
import { Logger } from '@nestjs/common';
import { EventsHandler, IEventHandler } from '@nestjs/cqrs';
import { RealtimeService } from '../../services';

@EventsHandler(CategoryUpdatedEvent)
export class CategoryUpdatedHandler implements IEventHandler<CategoryUpdatedEvent> {
  readonly #logger = new Logger(CategoryUpdatedHandler.name);

  constructor(private readonly _realtime: RealtimeService) {}

  handle(event: CategoryUpdatedEvent) {
    this.#logger.debug(`Catching CategoryUpdatedEvent...`);
    this._realtime.publish(event.establishmentId, RealtimeEvents.categoryUpdated, event.category);
  }
}
