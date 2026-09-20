import { ErrorCodes } from '@coaster/common';
import { BETA_ALLOWLIST_ENABLED, DbUserWithPreferences, isBetaAllowlistEnabled } from '@coaster/core';
import { DbAuthEventType, DbAuthProvider, DbService } from '@coaster/core/db';
import { ForbiddenException, Logger, ServiceUnavailableException, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CommandHandler, EventBus, ICommandHandler } from '@nestjs/cqrs';
import { AuthIdentityRepository } from '../../data-access/auth-identity.repository';
import { AuthSessionRepository } from '../../data-access/auth-session.repository';
import { AuthUserRepository } from '../../data-access/auth-user.repository';
import { AuthEventOccurred } from '../../events/impl/auth-event.event';
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
    private readonly _users: AuthUserRepository,
    private readonly _session: SessionService,
    private readonly _config: ConfigService,
    private readonly _events: EventBus,
  ) {}

  async execute(command: LoginWithGoogleCommand): Promise<IssuedSession> {
    if (!this._google.configured) {
      this.#logger.error(`Refusing a Google sign-in: no client id is configured`);
      throw new ServiceUnavailableException(ErrorCodes.GOOGLE_SIGN_IN_UNAVAILABLE);
    }

    const identity = await this._google.verify(command.credential);

    if (!identity) {
      this.#refused(command, null, null, 'google_token_rejected');

      throw new UnauthorizedException(ErrorCodes.INVALID_CREDENTIALS);
    }

    const linked = await this._identities.findUserBySubject(DbAuthProvider.GOOGLE, identity.subject);

    if (linked) {
      if (!linked.active) {
        this.#refused(command, linked.id, identity.email, 'inactive');

        throw new UnauthorizedException(ErrorCodes.INVALID_CREDENTIALS);
      }

      await this._identities.touch(DbAuthProvider.GOOGLE, identity.subject);

      return this.#signedIn(command, await this._session.issue(linked, command.origin), linked.id, identity.email);
    }

    const byEmail = await this._db.dbUser.findUnique({
      where: { email: identity.email },
      include: { preferences: true },
    });

    if (byEmail) {
      if (!byEmail.active) {
        this.#refused(command, byEmail.id, identity.email, 'inactive');

        throw new UnauthorizedException(ErrorCodes.INVALID_CREDENTIALS);
      }

      const claimed = await this.#claim(byEmail, identity);

      this._events.publish(
        new AuthEventOccurred({
          type: DbAuthEventType.IDENTITY_LINKED,
          userId: claimed.id,
          email: identity.email,
          ...command.origin,
          metadata: { provider: DbAuthProvider.GOOGLE },
        }),
      );

      return this.#signedIn(command, await this._session.issue(claimed, command.origin), claimed.id, identity.email);
    }

    if (await this.#outsideBeta(identity.email)) {
      this.#logger.warn(`Refusing to open an account for ${identity.email}: not on the beta allowlist`);
      this.#refused(command, null, identity.email, 'outside_beta');

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
          create: {
            provider: DbAuthProvider.GOOGLE,
            subject: identity.subject,
            email: identity.email,
            lastLoginAt: new Date(),
          },
        },
      },
      include: { preferences: true },
    });

    const issued = await this._session.issue(created, command.origin);

    this._events.publish(
      new AuthEventOccurred({
        type: DbAuthEventType.REGISTERED,
        userId: created.id,
        email: created.email,
        sessionId: issued.sessionId,
        ...command.origin,
        metadata: { provider: DbAuthProvider.GOOGLE },
      }),
    );

    this._events.publish(
      new AuthEventOccurred({
        type: DbAuthEventType.IDENTITY_LINKED,
        userId: created.id,
        email: created.email,
        ...command.origin,
        metadata: { provider: DbAuthProvider.GOOGLE },
      }),
    );

    return this.#signedIn(command, issued, created.id, identity.email);
  }

  #signedIn(command: LoginWithGoogleCommand, issued: IssuedSession, userId: string, email: string): IssuedSession {
    this._events.publish(
      new AuthEventOccurred({
        type: DbAuthEventType.LOGIN_SUCCEEDED,
        userId,
        email,
        sessionId: issued.sessionId,
        ...command.origin,
        metadata: { method: 'google' },
      }),
    );

    return issued;
  }

  #refused(command: LoginWithGoogleCommand, userId: string | null, email: string | null, reason: string): void {
    this._events.publish(
      new AuthEventOccurred({
        type: DbAuthEventType.LOGIN_FAILED,
        userId,
        email,
        ...command.origin,
        metadata: { method: 'google', reason },
      }),
    );
  }

  async #claim(user: DbUserWithPreferences, identity: GoogleIdentity): Promise<DbUserWithPreferences> {
    const passwordNobodyProved = user.emailVerifiedAt === null && user.passwordHash !== null;

    if (passwordNobodyProved) {
      this.#logger.warn(`Dropping the unverified password on ${user.id}: Google has proved the address`);
      await this._sessions.revokeEverySessionOf(user.id);
    }

    await this._identities.link(user.id, DbAuthProvider.GOOGLE, identity.subject, identity.email);

    return this._users.update(user.id, {
      emailVerifiedAt: user.emailVerifiedAt ?? new Date(),
      ...(passwordNobodyProved && { passwordHash: null, passwordUpdatedAt: null }),
      ...(user.photoUrl === null && identity.picture ? { photoUrl: identity.picture } : {}),
    });
  }

  async #outsideBeta(email: string): Promise<boolean> {
    if (!isBetaAllowlistEnabled(this._config.get<string>(BETA_ALLOWLIST_ENABLED))) {
      return false;
    }

    return !(await this._db.dbBetaTester.findUnique({ where: { email } }));
  }
}
