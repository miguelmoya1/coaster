import { ErrorCodes } from '@coaster/common';
import { BETA_ALLOWLIST_ENABLED, isBetaAllowlistEnabled } from '@coaster/core';
import { DbService } from '@coaster/core/db';
import { ConflictException, ForbiddenException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { hashPassword } from '../../domain/password';
import { IssuedSession, SessionService } from '../../services/session.service';
import { RegisterCommand } from '../impl/register.command';

@CommandHandler(RegisterCommand)
export class RegisterHandler implements ICommandHandler<RegisterCommand, IssuedSession> {
  readonly #logger = new Logger(RegisterHandler.name);

  constructor(
    private readonly _db: DbService,
    private readonly _sessions: SessionService,
    private readonly _config: ConfigService,
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

    return this._sessions.issue(user, command.origin);
  }

  async #outsideBeta(email: string): Promise<boolean> {
    if (!isBetaAllowlistEnabled(this._config.get<string>(BETA_ALLOWLIST_ENABLED))) {
      return false;
    }

    return !(await this._db.dbBetaTester.findUnique({ where: { email } }));
  }
}
