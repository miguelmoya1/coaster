import { EventsHandler, IEventHandler } from '@nestjs/cqrs';
import { MemberRemovedEvent } from './member-removed.event';
import { BarGateway } from '../../../core';
import { SocketEvents } from '@coaster/common';

@EventsHandler(MemberRemovedEvent)
export class MemberRemovedHandler implements IEventHandler<MemberRemovedEvent> {
  constructor(private readonly _barGateway: BarGateway) {}

  handle(event: MemberRemovedEvent) {
    this._barGateway.server.to(event.barId).emit(SocketEvents.MEMBER_REMOVED, { id: event.memberId });
  }
}
