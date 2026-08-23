import { CacheKeys, CacheService } from '@coaster/core';
import { Logger } from '@nestjs/common';
import { EventsHandler, IEventHandler } from '@nestjs/cqrs';
import { EstablishmentSettingsUpdatedEvent } from '../impl/establishment-settings-updated.event';

@EventsHandler(EstablishmentSettingsUpdatedEvent)
export class ForgetModulesCacheHandler implements IEventHandler<EstablishmentSettingsUpdatedEvent> {
  readonly #logger = new Logger(ForgetModulesCacheHandler.name);

  constructor(private readonly _cache: CacheService) {}

  async handle(event: EstablishmentSettingsUpdatedEvent) {
    this.#logger.debug(`Catching EstablishmentSettingsUpdatedEvent for establishmentId=${event.establishmentId}...`);

    await this._cache.forget(CacheKeys.modules(event.establishmentId));
  }
}
