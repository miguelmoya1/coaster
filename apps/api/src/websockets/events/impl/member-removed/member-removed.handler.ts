import { EventsHandler, IEventHandler } from '@nestjs/cqrs';
import { MemberRemovedEvent, SocketEvents } from '../../../../core';
import { BarGateway } from '../../../bar.gateway';

@EventsHandler(MemberRemovedEvent)
export class MemberRemovedHandler implements IEventHandler<MemberRemovedEvent> {
  constructor(private readonly _barGateway: BarGateway) {}

  handle(event: MemberRemovedEvent) {
    const { barId, memberId } = event;

    this._barGateway.server.to(barId).emit(SocketEvents.MEMBER_REMOVED, { id: memberId });
  }
}
