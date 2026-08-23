import { CategoryDeletedEvent } from '@coaster/categories';
import { RealtimeEvents } from '@coaster/common';
import { Logger } from '@nestjs/common';
import { EventsHandler, IEventHandler } from '@nestjs/cqrs';
import { RealtimeService } from '../../services';

@EventsHandler(CategoryDeletedEvent)
export class CategoryDeletedHandler implements IEventHandler<CategoryDeletedEvent> {
  readonly #logger = new Logger(CategoryDeletedHandler.name);

  constructor(private readonly _realtime: RealtimeService) {}

  handle(event: CategoryDeletedEvent) {
    this.#logger.debug(`Catching CategoryDeletedEvent...`);
    this._realtime.publish(event.establishmentId, RealtimeEvents.categoryDeleted, { id: event.categoryId });
  }
}
