import { AuthTokenRepository } from '@coaster/auth';
import { MemberInvitedEvent } from '@coaster/establishment-members';
import { DbAuthTokenPurpose } from '@coaster/core/db';
import { Logger } from '@nestjs/common';
import { EventsHandler, IEventHandler } from '@nestjs/cqrs';
import { EmailService } from '../../email.service';

@EventsHandler(MemberInvitedEvent)
export class MemberInvitedHandler implements IEventHandler<MemberInvitedEvent> {
  readonly #logger = new Logger(MemberInvitedHandler.name);

  constructor(
    private readonly _emailService: EmailService,
    private readonly _tokens: AuthTokenRepository,
  ) {}

  async handle(event: MemberInvitedEvent) {
    this.#logger.debug(`Catching MemberInvitedEvent...`);
    const { email, establishmentName, inviterName, inviterLanguage, userId } = event;

    try {
      const token = await this._tokens.issue(userId, DbAuthTokenPurpose.INVITE);

      await this._emailService.sendInvite(email, { establishmentName, inviterName, token }, inviterLanguage);
    } catch (error) {
      this.#logger.error(`The invitation to ${email} for ${establishmentName} never left: ${(error as Error).message}`);
    }
  }
}
