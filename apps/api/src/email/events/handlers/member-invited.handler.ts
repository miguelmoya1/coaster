import { AuthTokenRepository } from '@coaster/auth';
import { AUTH_MAILER, type AuthMailer } from '@coaster/core';
import { DbAuthTokenPurpose } from '@coaster/core/db';
import { MemberInvitedEvent } from '@coaster/establishment-members';
import { Inject, Logger } from '@nestjs/common';
import { EventsHandler, IEventHandler } from '@nestjs/cqrs';

@EventsHandler(MemberInvitedEvent)
export class MemberInvitedHandler implements IEventHandler<MemberInvitedEvent> {
  readonly #logger = new Logger(MemberInvitedHandler.name);

  constructor(
    @Inject(AUTH_MAILER) private readonly _mailer: AuthMailer,
    private readonly _tokens: AuthTokenRepository,
  ) {}

  async handle(event: MemberInvitedEvent) {
    this.#logger.debug(`Catching MemberInvitedEvent...`);
    const { email, establishmentName, inviterName, inviterLanguage, userId } = event;

    try {
      const token = await this._tokens.issue(userId, DbAuthTokenPurpose.INVITE);

      await this._mailer.sendInvite(email, { establishmentName, inviterName, token }, inviterLanguage);
    } catch (error) {
      this.#logger.error(`The invitation to ${email} for ${establishmentName} never left: ${(error as Error).message}`);
    }
  }
}
