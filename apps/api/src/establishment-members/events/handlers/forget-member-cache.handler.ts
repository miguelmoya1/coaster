import { CacheKeys, CacheService } from '@coaster/core';
import { Logger } from '@nestjs/common';
import { EventsHandler, IEventHandler } from '@nestjs/cqrs';
import { MemberInvitedEvent } from '../impl/member-invited.event';
import { MemberRemovedEvent } from '../impl/member-removed.event';
import { MemberRoleChangedEvent } from '../impl/member-role-changed.event';

type MembershipEvent = MemberInvitedEvent | MemberRemovedEvent | MemberRoleChangedEvent;

@EventsHandler(MemberInvitedEvent, MemberRemovedEvent, MemberRoleChangedEvent)
export class ForgetMemberCacheHandler implements IEventHandler<MembershipEvent> {
  readonly #logger = new Logger(ForgetMemberCacheHandler.name);

  constructor(private readonly _cache: CacheService) {}

  async handle(event: MembershipEvent) {
    this.#logger.debug(`Catching membership change for userId=${event.userId}...`);

    await this._cache.forget(CacheKeys.membership(event.establishmentId, event.userId));
  }
}
