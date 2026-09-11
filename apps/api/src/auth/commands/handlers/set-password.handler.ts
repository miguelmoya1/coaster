import { ErrorCodes } from '@coaster/common';
import type { AuthMailer } from '@coaster/core';
import { AUTH_MAILER } from '@coaster/core';
import { BadRequestException, Inject, Logger, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { AuthSessionRepository } from '../../data-access/auth-session.repository';
import { AuthUserRepository } from '../../data-access/auth-user.repository';
import { hashPassword, verifyPassword } from '../../domain/password';
import { SetPasswordCommand } from '../impl/set-password.command';

@CommandHandler(SetPasswordCommand)
export class SetPasswordHandler implements ICommandHandler<SetPasswordCommand, void> {
  readonly #logger = new Logger(SetPasswordHandler.name);

  constructor(
    private readonly _users: AuthUserRepository,
    private readonly _sessions: AuthSessionRepository,
    @Inject(AUTH_MAILER) private readonly _email: AuthMailer,
  ) {}

  async execute(command: SetPasswordCommand): Promise<void> {
    const current = await this._users.findById(command.userId);

    if (!current) {
      throw new NotFoundException(ErrorCodes.USER_NOT_FOUND);
    }

    if (current.passwordHash) {
      if (!command.currentPassword) {
        throw new BadRequestException(ErrorCodes.PASSWORD_ALREADY_SET);
      }

      if (!(await verifyPassword(current.passwordHash, command.currentPassword))) {
        throw new UnauthorizedException(ErrorCodes.INVALID_CREDENTIALS);
      }
    }

    await this._sessions.revokeEveryOtherSessionOf(command.userId, command.sessionId);

    const user = await this._users.update(command.userId, {
      passwordHash: await hashPassword(command.password),
      passwordUpdatedAt: new Date(),
    });

    await this._email
      .sendPasswordChanged(user.email, user.name, user.preferences?.language)
      .catch((error: Error) => this.#logger.error(`Could not warn ${user.id} of the change: ${error.message}`));
  }
}
