import type { User } from '@coaster/common';
import { AccessTokenService, DbUserWithoutPassword, UsersMapper } from '@coaster/core';
import { Injectable } from '@nestjs/common';
import { AuthSessionRepository } from '../data-access/auth-session.repository';
import { hashRefreshToken, newFamilyId, newRefreshToken, refreshExpiryFrom } from '../domain/session';

export interface SessionOrigin {
  userAgent?: string;
  ip?: string;
}

export interface IssuedSession {
  user: User;
  accessToken: string;
  refreshToken: string;
  refreshExpiresAt: Date;
}

@Injectable()
export class SessionService {
  constructor(
    private readonly _sessions: AuthSessionRepository,
    private readonly _tokens: AccessTokenService,
  ) {}

  public async issue(user: DbUserWithoutPassword, origin: SessionOrigin): Promise<IssuedSession> {
    await this._sessions.pruneExpiredOf(user.id);

    const refreshToken = newRefreshToken();

    const session = await this._sessions.create({
      userId: user.id,
      tokenHash: hashRefreshToken(refreshToken),
      familyId: newFamilyId(),
      expiresAt: refreshExpiryFrom(new Date()),
      ...origin,
    });

    return this.#issued(user, session.id, refreshToken, session.expiresAt);
  }

  public async rotate(
    currentId: string,
    familyId: string,
    user: DbUserWithoutPassword,
    origin: SessionOrigin,
  ): Promise<IssuedSession> {
    const refreshToken = newRefreshToken();

    const session = await this._sessions.rotate(currentId, {
      userId: user.id,
      tokenHash: hashRefreshToken(refreshToken),
      familyId,
      expiresAt: refreshExpiryFrom(new Date()),
      ...origin,
    });

    return this.#issued(user, session.id, refreshToken, session.expiresAt);
  }

  public async revoke(refreshToken: string | undefined): Promise<void> {
    if (!refreshToken) {
      return;
    }

    const session = await this._sessions.findByTokenHash(hashRefreshToken(refreshToken));

    if (session) {
      await this._sessions.revokeFamily(session.familyId);
    }
  }

  public async revokeEverySessionOf(userId: string): Promise<void> {
    await this._sessions.revokeEverySessionOf(userId);
  }

  async #issued(
    user: DbUserWithoutPassword,
    sessionId: string,
    refreshToken: string,
    expiresAt: Date,
  ): Promise<IssuedSession> {
    return {
      user: UsersMapper.toDomain(user),
      accessToken: await this._tokens.sign(user.id, sessionId),
      refreshToken,
      refreshExpiresAt: expiresAt,
    };
  }
}
