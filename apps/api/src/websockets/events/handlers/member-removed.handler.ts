import { MemberRemovedEvent } from '@coaster/establishment-members';
import { SocketEvents } from '@coaster/common';
import { Logger } from '@nestjs/common';
import { EventsHandler, IEventHandler } from '@nestjs/cqrs';
import { EstablishmentGateway } from '../../establishment.gateway';

@EventsHandler(MemberRemovedEvent)
export class MemberRemovedHandler implements IEventHandler<MemberRemovedEvent> {
  readonly #logger = new Logger(MemberRemovedHandler.name);

  constructor(private readonly _establishmentGateway: EstablishmentGateway) {}

  async handle(event: MemberRemovedEvent) {
    this.#logger.debug(`Catching MemberRemovedEvent...`);
    const { establishmentId, memberId, userId } = event;

    this._establishmentGateway.server.to(establishmentId).emit(SocketEvents.memberRemoved, { id: memberId });

    await this._establishmentGateway.evictFromEstablishment(establishmentId, userId);
  }
}
