import { SocketEvents } from '@coaster/common';
import { EventsHandler, IEventHandler } from '@nestjs/cqrs';

import { BarGateway } from '../../../core';
import { TableDeletedEvent } from './table-deleted.event';

@EventsHandler(TableDeletedEvent)
export class TableDeletedHandler implements IEventHandler<TableDeletedEvent> {
  constructor(private readonly _barGateway: BarGateway) {}

  handle(event: TableDeletedEvent) {
    this._barGateway.server.to(event.barId).emit(SocketEvents.TABLE_DELETED, { id: event.tableId });
  }
}
