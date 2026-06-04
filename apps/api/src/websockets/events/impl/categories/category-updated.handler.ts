import { Logger } from '@nestjs/common';
import { EventsHandler, IEventHandler } from '@nestjs/cqrs';
import { CategoryUpdatedEvent } from '../../../../events';
import { SocketEvents } from '../../../../core';
import { BarGateway } from '../../../bar.gateway';

@EventsHandler(CategoryUpdatedEvent)
export class CategoryUpdatedHandler implements IEventHandler<CategoryUpdatedEvent> {
  readonly #logger = new Logger(CategoryUpdatedHandler.name);

  constructor(private readonly _barGateway: BarGateway) {}

  handle(event: CategoryUpdatedEvent) {
    this.#logger.debug(`Catching CategoryUpdatedEvent...`);
    this._barGateway.server.to(event.barId).emit(SocketEvents.CATEGORY_UPDATED, event.category);
  }
}
