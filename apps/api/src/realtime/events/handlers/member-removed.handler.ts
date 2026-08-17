import { MemberRemovedEvent } from '@coaster/establishment-members';
import { RealtimeEvents } from '@coaster/common';
import { Logger } from '@nestjs/common';
import { EventsHandler, IEventHandler } from '@nestjs/cqrs';
import { RealtimeService } from '../../services';

@EventsHandler(MemberRemovedEvent)
export class MemberRemovedHandler implements IEventHandler<MemberRemovedEvent> {
  readonly #logger = new Logger(MemberRemovedHandler.name);

  constructor(private readonly _realtime: RealtimeService) {}

  handle(event: MemberRemovedEvent) {
    this.#logger.debug(`Catching MemberRemovedEvent...`);
    const { establishmentId, memberId, userId } = event;

    this._realtime.publish(establishmentId, RealtimeEvents.memberRemoved, { id: memberId });
    this._realtime.revoke(establishmentId, userId);
  }
}
