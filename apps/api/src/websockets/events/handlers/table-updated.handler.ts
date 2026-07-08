import { SocketEvents } from '@coaster/common';
import { Logger } from '@nestjs/common';
import { EventsHandler, IEventHandler } from '@nestjs/cqrs';
import { TableUpdatedEvent } from '@tables/events';
import { BarGateway } from '../../bar.gateway';

@EventsHandler(TableUpdatedEvent)
export class TableUpdatedHandler implements IEventHandler<TableUpdatedEvent> {
  readonly #logger = new Logger(TableUpdatedHandler.name);

  constructor(private readonly _barGateway: BarGateway) {}

  handle(event: TableUpdatedEvent) {
    this.#logger.debug(`Catching TableUpdatedEvent...`);
    this._barGateway.server.to(event.barId).emit(SocketEvents.tableUpdated, event.table);
  }
}
