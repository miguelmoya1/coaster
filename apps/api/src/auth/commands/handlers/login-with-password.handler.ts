import { ErrorCodes } from '@coaster/common';
import { DbAuthEventType, DbService } from '@coaster/core/db';
import { HttpException, HttpStatus, UnauthorizedException } from '@nestjs/common';
import { CommandHandler, EventBus, ICommandHandler } from '@nestjs/cqrs';
import { burnVerificationTime, verifyPassword } from '../../domain/password';
import { AuthEventOccurred } from '../../events/impl/auth-event.event';
import { LoginAttemptsService } from '../../services/login-attempts.service';
import { IssuedSession, SessionService } from '../../services/session.service';
import { LoginWithPasswordCommand } from '../impl/login-with-password.command';

@CommandHandler(LoginWithPasswordCommand)
export class LoginWithPasswordHandler implements ICommandHandler<LoginWithPasswordCommand, IssuedSession> {
  constructor(
    private readonly _db: DbService,
    private readonly _sessions: SessionService,
    private readonly _attempts: LoginAttemptsService,
    private readonly _events: EventBus,
  ) {}

  async execute(command: LoginWithPasswordCommand): Promise<IssuedSession> {
    const email = command.email.trim().toLowerCase();
    const wait = await this._attempts.lockedFor(email);

    if (wait > 0) {
      this._events.publish(
        new AuthEventOccurred({
          type: DbAuthEventType.LOGIN_BLOCKED,
          email,
          ...command.origin,
          metadata: { retryAfterSeconds: wait },
        }),
      );

      throw new HttpException(ErrorCodes.TOO_MANY_ATTEMPTS, HttpStatus.TOO_MANY_REQUESTS);
    }

    const user = await this._db.dbUser.findUnique({
      where: { email },
      include: { preferences: true },
    });

    const matches = user?.passwordHash
      ? await verifyPassword(user.passwordHash, command.password)
      : await burnVerificationTime();

    if (!user || !matches || !user.active) {
      await this.#turnAway(command, email, user?.id, this.#reasonFor(user, matches));

      throw new UnauthorizedException(ErrorCodes.INVALID_CREDENTIALS);
    }

    await this._attempts.forget(email);

    const issued = await this._sessions.issue(user, command.origin);

    this._events.publish(
      new AuthEventOccurred({
        type: DbAuthEventType.LOGIN_SUCCEEDED,
        userId: user.id,
        email,
        sessionId: issued.sessionId,
        ...command.origin,
        metadata: { method: 'password' },
      }),
    );

    return issued;
  }

  /**
   * The caller is told the same thing whichever of these it was, so the reason only ever goes
   * to the log, where telling a wrong password from an address nobody has is the whole point.
   */
  async #turnAway(
    command: LoginWithPasswordCommand,
    email: string,
    userId: string | undefined,
    reason: string,
  ): Promise<void> {
    await this._attempts.remember(email);

    this._events.publish(
      new AuthEventOccurred({
        type: DbAuthEventType.LOGIN_FAILED,
        userId,
        email,
        ...command.origin,
        metadata: { reason },
      }),
    );
  }

  #reasonFor(user: { active: boolean } | null, matches: boolean): string {
    if (!user) {
      return 'no_account';
    }

    return matches ? 'inactive' : 'wrong_password';
  }
}
