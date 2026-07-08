import { CategoryDeletedEvent } from '@categories/events';
import { SocketEvents } from '@coaster/common';
import { Logger } from '@nestjs/common';
import { EventsHandler, IEventHandler } from '@nestjs/cqrs';
import { BarGateway } from '../../bar.gateway';

@EventsHandler(CategoryDeletedEvent)
export class CategoryDeletedHandler implements IEventHandler<CategoryDeletedEvent> {
  readonly #logger = new Logger(CategoryDeletedHandler.name);

  constructor(private readonly _barGateway: BarGateway) {}

  handle(event: CategoryDeletedEvent) {
    this.#logger.debug(`Catching CategoryDeletedEvent...`);
    this._barGateway.server.to(event.barId).emit(SocketEvents.categoryDeleted, { id: event.categoryId });
  }
}
