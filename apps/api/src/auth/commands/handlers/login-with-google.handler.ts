import { ErrorCodes } from '@coaster/common';
import { BETA_ALLOWLIST_ENABLED, DbUserWithPreferences, isBetaAllowlistEnabled } from '@coaster/core';
import { DbAuthProvider, DbService } from '@coaster/core/db';
import { ForbiddenException, Logger, ServiceUnavailableException, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { AuthIdentityRepository } from '../../data-access/auth-identity.repository';
import { AuthSessionRepository } from '../../data-access/auth-session.repository';
import { GoogleIdentity, GoogleTokenService } from '../../services/google-token.service';
import { IssuedSession, SessionService } from '../../services/session.service';
import { LoginWithGoogleCommand } from '../impl/login-with-google.command';

@CommandHandler(LoginWithGoogleCommand)
export class LoginWithGoogleHandler implements ICommandHandler<LoginWithGoogleCommand, IssuedSession> {
  readonly #logger = new Logger(LoginWithGoogleHandler.name);

  constructor(
    private readonly _db: DbService,
    private readonly _google: GoogleTokenService,
    private readonly _identities: AuthIdentityRepository,
    private readonly _sessions: AuthSessionRepository,
    private readonly _session: SessionService,
    private readonly _config: ConfigService,
  ) {}

  async execute(command: LoginWithGoogleCommand): Promise<IssuedSession> {
    if (!this._google.configured) {
      this.#logger.error(`Refusing a Google sign-in: no client id is configured`);
      throw new ServiceUnavailableException(ErrorCodes.GOOGLE_SIGN_IN_UNAVAILABLE);
    }

    const identity = await this._google.verify(command.credential);

    if (!identity) {
      throw new UnauthorizedException(ErrorCodes.INVALID_CREDENTIALS);
    }

    const linked = await this._identities.findUserBySubject(DbAuthProvider.GOOGLE, identity.subject);

    if (linked) {
      if (!linked.active) {
        throw new UnauthorizedException(ErrorCodes.INVALID_CREDENTIALS);
      }

      await this._identities.touch(DbAuthProvider.GOOGLE, identity.subject);

      return this._session.issue(linked, command.origin);
    }

    const byEmail = await this._db.dbUser.findUnique({
      where: { email: identity.email },
      include: { preferences: true },
    });

    if (byEmail) {
      if (!byEmail.active) {
        throw new UnauthorizedException(ErrorCodes.INVALID_CREDENTIALS);
      }

      return this._session.issue(await this.#claim(byEmail, identity), command.origin);
    }

    if (await this.#outsideBeta(identity.email)) {
      this.#logger.warn(`Refusing to open an account for ${identity.email}: not on the beta allowlist`);
      throw new ForbiddenException(ErrorCodes.BETA_ACCESS_REQUIRED);
    }

    const created = await this._db.dbUser.create({
      data: {
        email: identity.email,
        name: identity.name || identity.email.split('@')[0],
        photoUrl: identity.picture,
        emailVerifiedAt: new Date(),
        preferences: { create: {} },
        identities: {
          create: { provider: DbAuthProvider.GOOGLE, subject: identity.subject, email: identity.email, lastLoginAt: new Date() },
        },
      },
      include: { preferences: true },
    });

    return this._session.issue(created, command.origin);
  }

  async #claim(user: DbUserWithPreferences, identity: GoogleIdentity): Promise<DbUserWithPreferences> {
    const passwordNobodyProved = user.emailVerifiedAt === null && user.passwordHash !== null;

    if (passwordNobodyProved) {
      this.#logger.warn(`Dropping the unverified password on ${user.id}: Google has proved the address`);
      await this._sessions.revokeEverySessionOf(user.id);
    }

    await this._identities.link(user.id, DbAuthProvider.GOOGLE, identity.subject, identity.email);

    return this._db.dbUser.update({
      where: { id: user.id },
      data: {
        emailVerifiedAt: user.emailVerifiedAt ?? new Date(),
        ...(passwordNobodyProved && { passwordHash: null, passwordUpdatedAt: null }),
        ...(user.photoUrl === null && identity.picture ? { photoUrl: identity.picture } : {}),
      },
      include: { preferences: true },
    });
  }

  async #outsideBeta(email: string): Promise<boolean> {
    if (!isBetaAllowlistEnabled(this._config.get<string>(BETA_ALLOWLIST_ENABLED))) {
      return false;
    }

    return !(await this._db.dbBetaTester.findUnique({ where: { email } }));
  }
}
