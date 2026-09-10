import { ErrorCodes } from '@coaster/common';
import type { AuthMailer } from '@coaster/core';
import { AUTH_MAILER } from '@coaster/core';
import { DbAuthTokenPurpose } from '@coaster/core/db';
import { Inject, Logger, NotFoundException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { AuthTokenRepository } from '../../data-access/auth-token.repository';
import { AuthUserRepository } from '../../data-access/auth-user.repository';
import { RequestEmailVerificationCommand } from '../impl/request-email-verification.command';

@CommandHandler(RequestEmailVerificationCommand)
export class RequestEmailVerificationHandler implements ICommandHandler<RequestEmailVerificationCommand, void> {
  readonly #logger = new Logger(RequestEmailVerificationHandler.name);

  constructor(
    private readonly _users: AuthUserRepository,
    private readonly _tokens: AuthTokenRepository,
    @Inject(AUTH_MAILER) private readonly _email: AuthMailer,
  ) {}

  async execute(command: RequestEmailVerificationCommand): Promise<void> {
    const user = await this._users.findById(command.userId);

    if (!user) {
      throw new NotFoundException(ErrorCodes.USER_NOT_FOUND);
    }

    if (user.emailVerifiedAt) {
      this.#logger.debug(`Nothing to send: ${user.id} verified their address already`);

      return;
    }

    const token = await this._tokens.issue(user.id, DbAuthTokenPurpose.EMAIL_VERIFICATION);

    await this._email.sendEmailVerification(user.email, user.name, token, user.preferences?.language);
  }
}
