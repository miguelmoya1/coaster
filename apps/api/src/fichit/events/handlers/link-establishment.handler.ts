import { EstablishmentCreatedEvent } from '@coaster/establishments';
import { Logger } from '@nestjs/common';
import { EventsHandler, IEventHandler } from '@nestjs/cqrs';
import { FichitSync } from '../../services/fichit-sync.service';

@EventsHandler(EstablishmentCreatedEvent)
export class LinkEstablishmentHandler implements IEventHandler<EstablishmentCreatedEvent> {
  readonly #logger = new Logger(LinkEstablishmentHandler.name);

  constructor(private readonly sync: FichitSync) {}

  async handle(event: EstablishmentCreatedEvent): Promise<void> {
    try {
      await this.sync.ensureCompany(event.establishmentId);
      await this.sync.ensureEmployee(event.establishmentId, event.ownerId);
    } catch (error) {
      this.#logger.error(
        `Could not link establishment ${event.establishmentId} to Fichit; the backfill will retry`,
        error,
      );
    }
  }
}
