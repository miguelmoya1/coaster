import { Logger } from '@nestjs/common';
import { EventsHandler, IEventHandler } from '@nestjs/cqrs';
import { TableCreatedEvent } from '@tables/events';
import { SocketEvents } from '../../../core';
import { BarGateway } from '../../bar.gateway';

@EventsHandler(TableCreatedEvent)
export class TableCreatedHandler implements IEventHandler<TableCreatedEvent> {
  readonly #logger = new Logger(TableCreatedHandler.name);

  constructor(private readonly _barGateway: BarGateway) {}

  handle(event: TableCreatedEvent) {
    this.#logger.debug(`Catching TableCreatedEvent...`);
    this._barGateway.server.to(event.barId).emit(SocketEvents.TABLE_CREATED, event.table);
  }
}
