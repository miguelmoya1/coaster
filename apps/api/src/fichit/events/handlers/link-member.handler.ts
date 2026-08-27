import { MemberInvitedEvent } from '@coaster/establishment-members';
import { Logger } from '@nestjs/common';
import { EventsHandler, IEventHandler } from '@nestjs/cqrs';
import { FichitSync } from '../../services/fichit-sync.service';

@EventsHandler(MemberInvitedEvent)
export class LinkMemberHandler implements IEventHandler<MemberInvitedEvent> {
  readonly #logger = new Logger(LinkMemberHandler.name);

  constructor(private readonly sync: FichitSync) {}

  async handle(event: MemberInvitedEvent): Promise<void> {
    try {
      await this.sync.ensureEmployee(event.establishmentId, event.userId);
    } catch (error) {
      this.#logger.error(
        `Could not link member ${event.userId} of ${event.establishmentId} to Fichit; the backfill will retry`,
        error,
      );
    }
  }
}
