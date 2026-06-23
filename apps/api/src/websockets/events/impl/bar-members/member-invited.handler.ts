import { MemberInvitedEvent } from '@bar-members/events';
import { Logger } from '@nestjs/common';
import { EventsHandler, IEventHandler } from '@nestjs/cqrs';
import { SocketEvents } from '../../../../core';
import { BarGateway } from '../../../bar.gateway';

@EventsHandler(MemberInvitedEvent)
export class MemberInvitedHandler implements IEventHandler<MemberInvitedEvent> {
  readonly #logger = new Logger(MemberInvitedHandler.name);

  constructor(private readonly _barGateway: BarGateway) {}

  handle(event: MemberInvitedEvent) {
    this.#logger.debug(`Catching MemberInvitedEvent...`);
    this._barGateway.server.to(event.barId).emit(SocketEvents.MEMBER_INVITED, { id: event.memberId });
  }
}
