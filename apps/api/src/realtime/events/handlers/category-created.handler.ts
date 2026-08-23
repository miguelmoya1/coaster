import { CategoryCreatedEvent } from '@coaster/categories';
import { RealtimeEvents } from '@coaster/common';
import { Logger } from '@nestjs/common';
import { EventsHandler, IEventHandler } from '@nestjs/cqrs';
import { RealtimeService } from '../../services';

@EventsHandler(CategoryCreatedEvent)
export class CategoryCreatedHandler implements IEventHandler<CategoryCreatedEvent> {
  readonly #logger = new Logger(CategoryCreatedHandler.name);

  constructor(private readonly _realtime: RealtimeService) {}

  handle(event: CategoryCreatedEvent) {
    this.#logger.debug(`Catching CategoryCreatedEvent...`);
    this._realtime.publish(event.establishmentId, RealtimeEvents.categoryCreated, event.category);
  }
}
