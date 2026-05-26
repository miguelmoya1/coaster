import { SocketEvents } from '@coaster/common';
import { EventsHandler, IEventHandler } from '@nestjs/cqrs';

import { BarGateway } from '../../../core';
import { MemberRemovedEvent } from './member-removed.event';

@EventsHandler(MemberRemovedEvent)
export class MemberRemovedHandler implements IEventHandler<MemberRemovedEvent> {
  constructor(private readonly _barGateway: BarGateway) {}

  handle(event: MemberRemovedEvent) {
    this._barGateway.server.to(event.barId).emit(SocketEvents.MEMBER_REMOVED, { id: event.memberId });
  }
}
