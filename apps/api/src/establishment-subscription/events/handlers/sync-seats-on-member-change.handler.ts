import { MemberInvitedEvent, MemberRemovedEvent } from '@coaster/establishment-members';
import { Logger } from '@nestjs/common';
import { CommandBus, EventsHandler, IEventHandler } from '@nestjs/cqrs';
import { SyncSubscriptionSeatsCommand } from '../../commands/impl/sync-subscription-seats.command';

@EventsHandler(MemberInvitedEvent, MemberRemovedEvent)
export class SyncSeatsOnMemberChangeHandler implements IEventHandler<MemberInvitedEvent | MemberRemovedEvent> {
  readonly #logger = new Logger(SyncSeatsOnMemberChangeHandler.name);

  constructor(private readonly _commandBus: CommandBus) {}

  async handle(event: MemberInvitedEvent | MemberRemovedEvent): Promise<void> {
    try {
      await this._commandBus.execute(new SyncSubscriptionSeatsCommand(event.establishmentId));
    } catch (error) {
      this.#logger.error(
        `The staff of establishmentId=${event.establishmentId} changed but Stripe was not told: it keeps billing the ` +
          `old number of seats until the next change. Check it by hand. ${error}`,
      );
    }
  }
}
