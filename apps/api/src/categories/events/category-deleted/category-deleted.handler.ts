import { SocketEvents } from '@coaster/common';
import { EventsHandler, IEventHandler } from '@nestjs/cqrs';

import { BarGateway } from '../../../core';
import { CategoryDeletedEvent } from './category-deleted.event';

@EventsHandler(CategoryDeletedEvent)
export class CategoryDeletedHandler implements IEventHandler<CategoryDeletedEvent> {
  constructor(private readonly _barGateway: BarGateway) {}

  handle(event: CategoryDeletedEvent) {
    this._barGateway.server.to(event.barId).emit(SocketEvents.CATEGORY_DELETED, { id: event.categoryId });
  }
}
