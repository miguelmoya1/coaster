import { MemberRoleChangedEvent } from '@coaster/bar-members';
import { SocketEvents } from '@coaster/common';
import { Logger } from '@nestjs/common';
import { EventsHandler, IEventHandler } from '@nestjs/cqrs';
import { BarGateway } from '../../bar.gateway';

@EventsHandler(MemberRoleChangedEvent)
export class MemberRoleChangedHandler implements IEventHandler<MemberRoleChangedEvent> {
  readonly #logger = new Logger(MemberRoleChangedHandler.name);

  constructor(private readonly _barGateway: BarGateway) {}

  handle(event: MemberRoleChangedEvent) {
    this.#logger.debug(`Catching MemberRoleChangedEvent...`);
    this._barGateway.server
      .to(event.barId)
      .emit(SocketEvents.memberRoleChanged, { id: event.memberId, userId: event.userId, role: event.to });
  }
}
