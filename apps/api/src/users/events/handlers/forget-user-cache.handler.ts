import { CacheKeys, CacheService } from '@coaster/core';
import { Logger } from '@nestjs/common';
import { EventsHandler, IEventHandler } from '@nestjs/cqrs';
import { UserUpdatedEvent } from '../impl/user-updated.event';

@EventsHandler(UserUpdatedEvent)
export class ForgetUserCacheHandler implements IEventHandler<UserUpdatedEvent> {
  readonly #logger = new Logger(ForgetUserCacheHandler.name);

  constructor(private readonly _cache: CacheService) {}

  async handle(event: UserUpdatedEvent) {
    this.#logger.debug(`Catching UserUpdatedEvent for userId=${event.userId}...`);

    await this._cache.forget(CacheKeys.userRole(event.userId), CacheKeys.user(event.userId));
  }
}
