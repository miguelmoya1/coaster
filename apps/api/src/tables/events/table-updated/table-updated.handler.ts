import { SocketEvents } from '../../../core';
import { EventsHandler, IEventHandler } from '@nestjs/cqrs';
import { BarGateway } from '../../../core';
import { TableUpdatedEvent } from './table-updated.event';

@EventsHandler(TableUpdatedEvent)
export class TableUpdatedHandler implements IEventHandler<TableUpdatedEvent> {
  constructor(private readonly _barGateway: BarGateway) {}

  handle(event: TableUpdatedEvent) {
    this._barGateway.server.to(event.barId).emit(SocketEvents.TABLE_UPDATED, event.table);
  }
}
