import { RealtimeEvents } from '@coaster/common';
import { Logger } from '@nestjs/common';
import { EventsHandler, IEventHandler } from '@nestjs/cqrs';
import { TableUpdatedEvent } from '@coaster/tables';
import { RealtimeService } from '../../services';

@EventsHandler(TableUpdatedEvent)
export class TableUpdatedHandler implements IEventHandler<TableUpdatedEvent> {
  readonly #logger = new Logger(TableUpdatedHandler.name);

  constructor(private readonly _realtime: RealtimeService) {}

  handle(event: TableUpdatedEvent) {
    this.#logger.debug(`Catching TableUpdatedEvent...`);
    this._realtime.publish(event.establishmentId, RealtimeEvents.tableUpdated, event.table);
  }
}
