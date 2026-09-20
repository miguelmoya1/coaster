import { ErrorCodes } from '@coaster/common';
import { BETA_ALLOWLIST_ENABLED, isBetaAllowlistEnabled } from '@coaster/core';
import { DbAuthEventType, DbService } from '@coaster/core/db';
import { ConflictException, ForbiddenException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CommandHandler, EventBus, ICommandHandler } from '@nestjs/cqrs';
import { hashPassword } from '../../domain/password';
import { AuthEventOccurred } from '../../events/impl/auth-event.event';
import { PwnedPasswordsService } from '../../services/pwned-passwords.service';
import { IssuedSession, SessionService } from '../../services/session.service';
import { RegisterCommand } from '../impl/register.command';

@CommandHandler(RegisterCommand)
export class RegisterHandler implements ICommandHandler<RegisterCommand, IssuedSession> {
  readonly #logger = new Logger(RegisterHandler.name);

  constructor(
    private readonly _db: DbService,
    private readonly _sessions: SessionService,
    private readonly _config: ConfigService,
    private readonly _pwned: PwnedPasswordsService,
    private readonly _events: EventBus,
  ) {}

  async execute(command: RegisterCommand): Promise<IssuedSession> {
    const email = command.email.trim().toLowerCase();

    if (await this.#outsideBeta(email)) {
      this.#logger.warn(`Refusing to open an account for ${email}: not on the beta allowlist`);
      throw new ForbiddenException(ErrorCodes.BETA_ACCESS_REQUIRED);
    }

    if (await this._db.dbUser.findUnique({ where: { email }, select: { id: true } })) {
      throw new ConflictException(ErrorCodes.USER_ALREADY_EXISTS);
    }

    await this._pwned.assertNotCompromised(command.password);

    const user = await this._db.dbUser.create({
      data: {
        email,
        name: command.name.trim(),
        passwordHash: await hashPassword(command.password),
        passwordUpdatedAt: new Date(),
        preferences: { create: command.language ? { language: command.language } : {} },
      },
      include: { preferences: true },
    });

    const issued = await this._sessions.issue(user, command.origin);

    this._events.publish(
      new AuthEventOccurred({
        type: DbAuthEventType.REGISTERED,
        userId: user.id,
        email: user.email,
        sessionId: issued.sessionId,
        ...command.origin,
      }),
    );

    return issued;
  }

  async #outsideBeta(email: string): Promise<boolean> {
    if (!isBetaAllowlistEnabled(this._config.get<string>(BETA_ALLOWLIST_ENABLED))) {
      return false;
    }

    return !(await this._db.dbBetaTester.findUnique({ where: { email } }));
  }
}
