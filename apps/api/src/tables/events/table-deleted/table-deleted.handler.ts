import { EventsHandler, IEventHandler } from '@nestjs/cqrs';
import { TableDeletedEvent } from './table-deleted.event';
import { BarGateway } from '../../../core';
import { SocketEvents } from '@coaster/common';

@EventsHandler(TableDeletedEvent)
export class TableDeletedHandler implements IEventHandler<TableDeletedEvent> {
  constructor(private readonly _barGateway: BarGateway) {}

  handle(event: TableDeletedEvent) {
    this._barGateway.server.to(event.barId).emit(SocketEvents.TABLE_DELETED, { id: event.tableId });
  }
}
