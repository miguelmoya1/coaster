import { MemberInvitedEvent } from '@coaster/establishment-members';
import { SocketEvents } from '@coaster/common';
import { Logger } from '@nestjs/common';
import { EventsHandler, IEventHandler } from '@nestjs/cqrs';
import { EstablishmentGateway } from '../../establishment.gateway';

@EventsHandler(MemberInvitedEvent)
export class MemberInvitedHandler implements IEventHandler<MemberInvitedEvent> {
  readonly #logger = new Logger(MemberInvitedHandler.name);

  constructor(private readonly _establishmentGateway: EstablishmentGateway) {}

  handle(event: MemberInvitedEvent) {
    this.#logger.debug(`Catching MemberInvitedEvent...`);
    this._establishmentGateway.server
      .to(event.establishmentId)
      .emit(SocketEvents.memberInvited, { id: event.memberId });
  }
}
