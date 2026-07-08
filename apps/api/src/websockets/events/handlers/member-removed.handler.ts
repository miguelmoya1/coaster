import { MemberRemovedEvent } from '@bar-members/events';
import { SocketEvents } from '@coaster/common';
import { Logger } from '@nestjs/common';
import { EventsHandler, IEventHandler } from '@nestjs/cqrs';
import { BarGateway } from '../../bar.gateway';

@EventsHandler(MemberRemovedEvent)
export class MemberRemovedHandler implements IEventHandler<MemberRemovedEvent> {
  readonly #logger = new Logger(MemberRemovedHandler.name);

  constructor(private readonly _barGateway: BarGateway) {}

  handle(event: MemberRemovedEvent) {
    this.#logger.debug(`Catching MemberRemovedEvent...`);
    const { barId, memberId } = event;

    this._barGateway.server.to(barId).emit(SocketEvents.memberRemoved, { id: memberId });
  }
}
