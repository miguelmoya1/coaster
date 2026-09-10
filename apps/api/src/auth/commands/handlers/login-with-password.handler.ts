import { ErrorCodes } from '@coaster/common';
import { DbService } from '@coaster/core/db';
import { UnauthorizedException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { burnVerificationTime, verifyPassword } from '../../domain/password';
import { IssuedSession, SessionService } from '../../services/session.service';
import { LoginWithPasswordCommand } from '../impl/login-with-password.command';

@CommandHandler(LoginWithPasswordCommand)
export class LoginWithPasswordHandler implements ICommandHandler<LoginWithPasswordCommand, IssuedSession> {
  constructor(
    private readonly _db: DbService,
    private readonly _sessions: SessionService,
  ) {}

  async execute(command: LoginWithPasswordCommand): Promise<IssuedSession> {
    const user = await this._db.dbUser.findUnique({
      where: { email: command.email.trim().toLowerCase() },
      include: { preferences: true },
    });

    const matches = user?.passwordHash
      ? await verifyPassword(user.passwordHash, command.password)
      : await burnVerificationTime();

    if (!user || !matches || !user.active) {
      throw new UnauthorizedException(ErrorCodes.INVALID_CREDENTIALS);
    }

    return this._sessions.issue(user, command.origin);
  }
}
