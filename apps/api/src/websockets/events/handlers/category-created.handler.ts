import { CategoryCreatedEvent } from '@categories/events';
import { SocketEvents } from '@coaster/common';
import { Logger } from '@nestjs/common';
import { EventsHandler, IEventHandler } from '@nestjs/cqrs';
import { BarGateway } from '../../bar.gateway';

@EventsHandler(CategoryCreatedEvent)
export class CategoryCreatedHandler implements IEventHandler<CategoryCreatedEvent> {
  readonly #logger = new Logger(CategoryCreatedHandler.name);

  constructor(private readonly _barGateway: BarGateway) {}

  handle(event: CategoryCreatedEvent) {
    this.#logger.debug(`Catching CategoryCreatedEvent...`);
    this._barGateway.server.to(event.barId).emit(SocketEvents.categoryCreated, event.category);
  }
}
