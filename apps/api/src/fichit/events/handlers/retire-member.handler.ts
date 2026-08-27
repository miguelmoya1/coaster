import { MemberRemovedEvent } from '@coaster/establishment-members';
import { Logger } from '@nestjs/common';
import { EventsHandler, IEventHandler } from '@nestjs/cqrs';
import { FichitSync } from '../../services/fichit-sync.service';

@EventsHandler(MemberRemovedEvent)
export class RetireMemberHandler implements IEventHandler<MemberRemovedEvent> {
  readonly #logger = new Logger(RetireMemberHandler.name);

  constructor(private readonly sync: FichitSync) {}

  async handle(event: MemberRemovedEvent): Promise<void> {
    try {
      await this.sync.retireEmployee(event.establishmentId, event.userId);
    } catch (error) {
      this.#logger.error(`Could not retire member ${event.userId} of ${event.establishmentId} in Fichit`, error);
    }
  }
}
