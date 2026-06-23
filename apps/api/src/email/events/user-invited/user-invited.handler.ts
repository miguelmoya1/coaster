import { Logger } from '@nestjs/common';
import { EventsHandler, IEventHandler } from '@nestjs/cqrs';
import { UserInvitedEvent } from '@users/events';
import { EmailService } from '../../email.service';

@EventsHandler(UserInvitedEvent)
export class UserInvitedHandler implements IEventHandler<UserInvitedEvent> {
  readonly #logger = new Logger(UserInvitedHandler.name);

  constructor(private readonly _emailService: EmailService) {}

  async handle(event: UserInvitedEvent) {
    this.#logger.debug(`Catching UserInvitedEvent...`);
    const { email, barName, inviterName, inviterLanguage } = event;

    await this._emailService.sendInviteEmail(email, barName, inviterName, inviterLanguage);
  }
}
