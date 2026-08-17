import { RealtimeEvents } from '@coaster/common';
import { Logger } from '@nestjs/common';
import { EventsHandler, IEventHandler } from '@nestjs/cqrs';
import { TableDeletedEvent } from '@coaster/tables';
import { RealtimeService } from '../../services';

@EventsHandler(TableDeletedEvent)
export class TableDeletedHandler implements IEventHandler<TableDeletedEvent> {
  readonly #logger = new Logger(TableDeletedHandler.name);

  constructor(private readonly _realtime: RealtimeService) {}

  handle(event: TableDeletedEvent) {
    this.#logger.debug(`Catching TableDeletedEvent...`);
    this._realtime.publish(event.establishmentId, RealtimeEvents.tableDeleted, { id: event.tableId });
  }
}
