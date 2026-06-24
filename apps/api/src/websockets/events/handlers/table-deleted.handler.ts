import { Logger } from '@nestjs/common';
import { EventsHandler, IEventHandler } from '@nestjs/cqrs';
import { TableDeletedEvent } from '@tables/events';
import { SocketEvents } from '../../../core';
import { BarGateway } from '../../bar.gateway';

@EventsHandler(TableDeletedEvent)
export class TableDeletedHandler implements IEventHandler<TableDeletedEvent> {
  readonly #logger = new Logger(TableDeletedHandler.name);

  constructor(private readonly _barGateway: BarGateway) {}

  handle(event: TableDeletedEvent) {
    this.#logger.debug(`Catching TableDeletedEvent...`);
    this._barGateway.server.to(event.barId).emit(SocketEvents.TABLE_DELETED, { id: event.tableId });
  }
}
