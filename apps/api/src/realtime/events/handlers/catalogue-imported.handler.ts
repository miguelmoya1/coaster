import { CatalogueImportedEvent } from '@coaster/catalogue';
import { RealtimeEvents } from '@coaster/common';
import { Logger } from '@nestjs/common';
import { EventsHandler, IEventHandler } from '@nestjs/cqrs';
import { RealtimeService } from '../../services';

@EventsHandler(CatalogueImportedEvent)
export class CatalogueImportedHandler implements IEventHandler<CatalogueImportedEvent> {
  readonly #logger = new Logger(CatalogueImportedHandler.name);

  constructor(private readonly _realtime: RealtimeService) {}

  handle(event: CatalogueImportedEvent) {
    this.#logger.debug(`Catching CatalogueImportedEvent...`);
    this._realtime.publish(event.establishmentId, RealtimeEvents.catalogueImported, {
      establishmentId: event.establishmentId,
    });
  }
}
