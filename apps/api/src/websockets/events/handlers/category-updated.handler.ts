import { CategoryUpdatedEvent } from '@categories/events';
import { SocketEvents } from '@coaster/common';
import { Logger } from '@nestjs/common';
import { EventsHandler, IEventHandler } from '@nestjs/cqrs';
import { BarGateway } from '../../bar.gateway';

@EventsHandler(CategoryUpdatedEvent)
export class CategoryUpdatedHandler implements IEventHandler<CategoryUpdatedEvent> {
  readonly #logger = new Logger(CategoryUpdatedHandler.name);

  constructor(private readonly _barGateway: BarGateway) {}

  handle(event: CategoryUpdatedEvent) {
    this.#logger.debug(`Catching CategoryUpdatedEvent...`);
    this._barGateway.server.to(event.barId).emit(SocketEvents.categoryUpdated, event.category);
  }
}
