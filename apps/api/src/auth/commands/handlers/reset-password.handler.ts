import { ErrorCodes } from '@coaster/common';
import type { AuthMailer } from '@coaster/core';
import { AUTH_MAILER } from '@coaster/core';
import { DbAuthTokenPurpose } from '@coaster/core/db';
import { BadRequestException, Inject, Logger, UnauthorizedException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { AuthSessionRepository } from '../../data-access/auth-session.repository';
import { AuthTokenRepository } from '../../data-access/auth-token.repository';
import { AuthUserRepository } from '../../data-access/auth-user.repository';
import { hashPassword } from '../../domain/password';
import { IssuedSession, SessionService } from '../../services/session.service';
import { ResetPasswordCommand } from '../impl/reset-password.command';

@CommandHandler(ResetPasswordCommand)
export class ResetPasswordHandler implements ICommandHandler<ResetPasswordCommand, IssuedSession> {
  readonly #logger = new Logger(ResetPasswordHandler.name);

  constructor(
    private readonly _users: AuthUserRepository,
    private readonly _tokens: AuthTokenRepository,
    private readonly _sessions: AuthSessionRepository,
    private readonly _session: SessionService,
    @Inject(AUTH_MAILER) private readonly _email: AuthMailer,
  ) {}

  async execute(command: ResetPasswordCommand): Promise<IssuedSession> {
    const token = await this._tokens.findUsable(command.token, DbAuthTokenPurpose.PASSWORD_RESET);

    if (!token || !(await this._tokens.spend(token.id))) {
      throw new BadRequestException(ErrorCodes.INVALID_TOKEN);
    }

    if (!token.user.active) {
      throw new UnauthorizedException(ErrorCodes.INVALID_CREDENTIALS);
    }

    await this._sessions.revokeEverySessionOf(token.userId);

    const user = await this._users.update(token.userId, {
      passwordHash: await hashPassword(command.password),
      passwordUpdatedAt: new Date(),
      emailVerifiedAt: token.user.emailVerifiedAt ?? new Date(),
    });

    await this._email
      .sendPasswordChanged(user.email, user.name, user.preferences?.language)
      .catch((error: Error) => this.#logger.error(`Could not warn ${user.id} of the change: ${error.message}`));

    return this._session.issue(user, command.origin);
  }
}
