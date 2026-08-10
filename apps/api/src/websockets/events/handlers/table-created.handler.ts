import { SocketEvents } from '@coaster/common';
import { Logger } from '@nestjs/common';
import { EventsHandler, IEventHandler } from '@nestjs/cqrs';
import { TableCreatedEvent } from '@coaster/tables';
import { EstablishmentGateway } from '../../establishment.gateway';

@EventsHandler(TableCreatedEvent)
export class TableCreatedHandler implements IEventHandler<TableCreatedEvent> {
  readonly #logger = new Logger(TableCreatedHandler.name);

  constructor(private readonly _establishmentGateway: EstablishmentGateway) {}

  handle(event: TableCreatedEvent) {
    this.#logger.debug(`Catching TableCreatedEvent...`);
    this._establishmentGateway.server.to(event.establishmentId).emit(SocketEvents.tableCreated, event.table);
  }
}
