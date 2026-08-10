import { MemberRoleChangedEvent } from '@coaster/establishment-members';
import { SocketEvents } from '@coaster/common';
import { Logger } from '@nestjs/common';
import { EventsHandler, IEventHandler } from '@nestjs/cqrs';
import { EstablishmentGateway } from '../../establishment.gateway';

@EventsHandler(MemberRoleChangedEvent)
export class MemberRoleChangedHandler implements IEventHandler<MemberRoleChangedEvent> {
  readonly #logger = new Logger(MemberRoleChangedHandler.name);

  constructor(private readonly _establishmentGateway: EstablishmentGateway) {}

  handle(event: MemberRoleChangedEvent) {
    this.#logger.debug(`Catching MemberRoleChangedEvent...`);
    this._establishmentGateway.server
      .to(event.establishmentId)
      .emit(SocketEvents.memberRoleChanged, { id: event.memberId, userId: event.userId, role: event.to });
  }
}
