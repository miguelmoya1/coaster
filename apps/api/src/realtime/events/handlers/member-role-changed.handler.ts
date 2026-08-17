import { MemberRoleChangedEvent } from '@coaster/establishment-members';
import { RealtimeEvents } from '@coaster/common';
import { Logger } from '@nestjs/common';
import { EventsHandler, IEventHandler } from '@nestjs/cqrs';
import { RealtimeService } from '../../services';

@EventsHandler(MemberRoleChangedEvent)
export class MemberRoleChangedHandler implements IEventHandler<MemberRoleChangedEvent> {
  readonly #logger = new Logger(MemberRoleChangedHandler.name);

  constructor(private readonly _realtime: RealtimeService) {}

  handle(event: MemberRoleChangedEvent) {
    this.#logger.debug(`Catching MemberRoleChangedEvent...`);
    this._realtime.publish(event.establishmentId, RealtimeEvents.memberRoleChanged, {
      id: event.memberId,
      userId: event.userId,
      role: event.to,
    });
  }
}
