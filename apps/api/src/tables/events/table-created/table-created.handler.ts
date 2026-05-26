import { SocketEvents } from '@coaster/common';
import { EventsHandler, IEventHandler } from '@nestjs/cqrs';

import { BarGateway } from '../../../core';
import { TableCreatedEvent } from './table-created.event';

@EventsHandler(TableCreatedEvent)
export class TableCreatedHandler implements IEventHandler<TableCreatedEvent> {
  constructor(private readonly _barGateway: BarGateway) {}

  handle(event: TableCreatedEvent) {
    this._barGateway.server.to(event.barId).emit(SocketEvents.TABLE_CREATED, event.table);
  }
}
