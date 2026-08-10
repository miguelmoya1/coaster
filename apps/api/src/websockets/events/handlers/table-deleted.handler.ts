import { SocketEvents } from '@coaster/common';
import { Logger } from '@nestjs/common';
import { EventsHandler, IEventHandler } from '@nestjs/cqrs';
import { TableDeletedEvent } from '@coaster/tables';
import { EstablishmentGateway } from '../../establishment.gateway';

@EventsHandler(TableDeletedEvent)
export class TableDeletedHandler implements IEventHandler<TableDeletedEvent> {
  readonly #logger = new Logger(TableDeletedHandler.name);

  constructor(private readonly _establishmentGateway: EstablishmentGateway) {}

  handle(event: TableDeletedEvent) {
    this.#logger.debug(`Catching TableDeletedEvent...`);
    this._establishmentGateway.server.to(event.establishmentId).emit(SocketEvents.tableDeleted, { id: event.tableId });
  }
}
