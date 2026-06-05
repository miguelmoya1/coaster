import { Logger } from '@nestjs/common';
import { EventsHandler, IEventHandler } from '@nestjs/cqrs';
import { CategoryDeletedEvent } from '../../../../events';
import { SocketEvents } from '../../../../core';
import { BarGateway } from '../../../bar.gateway';

@EventsHandler(CategoryDeletedEvent)
export class CategoryDeletedHandler implements IEventHandler<CategoryDeletedEvent> {
  readonly #logger = new Logger(CategoryDeletedHandler.name);

  constructor(private readonly _barGateway: BarGateway) {}

  handle(event: CategoryDeletedEvent) {
    this.#logger.debug(`Catching CategoryDeletedEvent...`);
    this._barGateway.server.to(event.barId).emit(SocketEvents.CATEGORY_DELETED, { id: event.categoryId });
  }
}
