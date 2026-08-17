import { MemberInvitedEvent } from '@coaster/establishment-members';
import { RealtimeEvents } from '@coaster/common';
import { Logger } from '@nestjs/common';
import { EventsHandler, IEventHandler } from '@nestjs/cqrs';
import { RealtimeService } from '../../services';

@EventsHandler(MemberInvitedEvent)
export class MemberInvitedHandler implements IEventHandler<MemberInvitedEvent> {
  readonly #logger = new Logger(MemberInvitedHandler.name);

  constructor(private readonly _realtime: RealtimeService) {}

  handle(event: MemberInvitedEvent) {
    this.#logger.debug(`Catching MemberInvitedEvent...`);
    this._realtime.publish(event.establishmentId, RealtimeEvents.memberInvited, { id: event.memberId });
  }
}
