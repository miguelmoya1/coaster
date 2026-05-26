import { EventsHandler, IEventHandler } from '@nestjs/cqrs';
import { CategoryDeletedEvent } from './category-deleted.event';
import { BarGateway } from '../../../core';
import { SocketEvents } from '@coaster/common';

@EventsHandler(CategoryDeletedEvent)
export class CategoryDeletedHandler implements IEventHandler<CategoryDeletedEvent> {
  constructor(private readonly _barGateway: BarGateway) {}

  handle(event: CategoryDeletedEvent) {
    this._barGateway.server.to(event.barId).emit(SocketEvents.CATEGORY_DELETED, { id: event.categoryId });
  }
}
