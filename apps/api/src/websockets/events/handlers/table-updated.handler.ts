import { SocketEvents } from '@coaster/common';
import { Logger } from '@nestjs/common';
import { EventsHandler, IEventHandler } from '@nestjs/cqrs';
import { TableUpdatedEvent } from '@coaster/tables';
import { EstablishmentGateway } from '../../establishment.gateway';

@EventsHandler(TableUpdatedEvent)
export class TableUpdatedHandler implements IEventHandler<TableUpdatedEvent> {
  readonly #logger = new Logger(TableUpdatedHandler.name);

  constructor(private readonly _establishmentGateway: EstablishmentGateway) {}

  handle(event: TableUpdatedEvent) {
    this.#logger.debug(`Catching TableUpdatedEvent...`);
    this._establishmentGateway.server.to(event.establishmentId).emit(SocketEvents.tableUpdated, event.table);
  }
}
