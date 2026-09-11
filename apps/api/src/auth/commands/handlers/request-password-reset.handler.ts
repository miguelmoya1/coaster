import type { AuthMailer } from '@coaster/core';
import { AUTH_MAILER } from '@coaster/core';
import { DbAuthTokenPurpose } from '@coaster/core/db';
import { Inject, Logger } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { AuthTokenRepository } from '../../data-access/auth-token.repository';
import { AuthUserRepository } from '../../data-access/auth-user.repository';
import { RequestPasswordResetCommand } from '../impl/request-password-reset.command';

@CommandHandler(RequestPasswordResetCommand)
export class RequestPasswordResetHandler implements ICommandHandler<RequestPasswordResetCommand, void> {
  readonly #logger = new Logger(RequestPasswordResetHandler.name);

  constructor(
    private readonly _users: AuthUserRepository,
    private readonly _tokens: AuthTokenRepository,
    @Inject(AUTH_MAILER) private readonly _email: AuthMailer,
  ) {}

  async execute(command: RequestPasswordResetCommand): Promise<void> {
    const user = await this._users.findByEmail(command.email);

    if (!user || !user.active) {
      this.#logger.debug('Nobody to write to; answering as if there were');

      return;
    }

    const token = await this._tokens.issue(user.id, DbAuthTokenPurpose.PASSWORD_RESET);

    await this._email.sendPasswordReset(user.email, user.name, token, user.preferences?.language);
  }
}
