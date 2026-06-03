import { SocketEvents } from '../../../core';
import { EventsHandler, IEventHandler } from '@nestjs/cqrs';
import { BarGateway } from '../../../websockets';
import { TableCreatedEvent } from './table-created.event';

@EventsHandler(TableCreatedEvent)
export class TableCreatedHandler implements IEventHandler<TableCreatedEvent> {
  constructor(private readonly _barGateway: BarGateway) {}

  handle(event: TableCreatedEvent) {
    this._barGateway.server.to(event.barId).emit(SocketEvents.TABLE_CREATED, event.table);
  }
}
