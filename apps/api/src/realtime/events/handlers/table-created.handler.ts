import { RealtimeEvents } from '@coaster/common';
import { Logger } from '@nestjs/common';
import { EventsHandler, IEventHandler } from '@nestjs/cqrs';
import { TableCreatedEvent } from '@coaster/tables';
import { RealtimeService } from '../../services';

@EventsHandler(TableCreatedEvent)
export class TableCreatedHandler implements IEventHandler<TableCreatedEvent> {
  readonly #logger = new Logger(TableCreatedHandler.name);

  constructor(private readonly _realtime: RealtimeService) {}

  handle(event: TableCreatedEvent) {
    this.#logger.debug(`Catching TableCreatedEvent...`);
    this._realtime.publish(event.establishmentId, RealtimeEvents.tableCreated, event.table);
  }
}
