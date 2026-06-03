import { EventsHandler, IEventHandler } from '@nestjs/cqrs';
import { UserInvitedEvent } from '../../../core';
import { EmailService } from '../../email.service';

@EventsHandler(UserInvitedEvent)
export class UserInvitedHandler implements IEventHandler<UserInvitedEvent> {
  constructor(private readonly _emailService: EmailService) {}

  async handle(event: UserInvitedEvent) {
    const { email, barName, inviterName } = event;

    await this._emailService.sendInviteEmail(email, barName, inviterName);
  }
}
