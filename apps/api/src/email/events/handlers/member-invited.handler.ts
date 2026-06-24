import { MemberInvitedEvent } from '@bar-members/events';
import { Logger } from '@nestjs/common';
import { EventsHandler, IEventHandler } from '@nestjs/cqrs';
import { EmailService } from '../../email.service';

@EventsHandler(MemberInvitedEvent)
export class MemberInvitedHandler implements IEventHandler<MemberInvitedEvent> {
  readonly #logger = new Logger(MemberInvitedHandler.name);

  constructor(private readonly _emailService: EmailService) {}

  async handle(event: MemberInvitedEvent) {
    this.#logger.debug(`Catching MemberInvitedEvent...`);
    const { email, barName, inviterName, inviterLanguage } = event;

    await this._emailService.sendInviteEmail(email, barName, inviterName, inviterLanguage);
  }
}
