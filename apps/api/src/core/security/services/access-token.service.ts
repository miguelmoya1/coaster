import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { jwtVerify, SignJWT } from 'jose';
import { CacheKeys } from '../../cache/cache-keys';
import { CacheService } from '../../cache/cache.service';
import { DbService } from '../../db';
import type { DbUserWithoutPassword } from '../../mappers/users.mapper';

export const AUTH_JWT_SECRET = 'AUTH_JWT_SECRET';

export const ACCESS_TOKEN_TTL_SECONDS = 15 * 60;

const ISSUER = 'coaster';

const AUDIENCE = 'coaster-api';

export interface AccessTokenClaims {
  sub: string;
  sid: string;
  iat: number;
  exp: number;
}

export interface VerifiedCaller {
  claims: AccessTokenClaims;
  user: DbUserWithoutPassword | null;
}

export const stripBearer = (value: string | undefined | null): string | null => {
  if (typeof value !== 'string' || value.length === 0) {
    return null;
  }

  return value.replace(/^Bearer\s+/i, '') || null;
};

@Injectable()
export class AccessTokenService {
  readonly #secret: Uint8Array;

  constructor(
    private readonly _db: DbService,
    private readonly _cache: CacheService,
    config: ConfigService,
  ) {
    const secret = config.get<string>(AUTH_JWT_SECRET);

    if (!secret) {
      throw new Error(
        `${AUTH_JWT_SECRET} environment variable is required. ` +
          'Generate one with: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"',
      );
    }

    this.#secret = new TextEncoder().encode(secret);
  }

  public sign(userId: string, sessionId: string): Promise<string> {
    return new SignJWT({ sid: sessionId })
      .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
      .setSubject(userId)
      .setIssuer(ISSUER)
      .setAudience(AUDIENCE)
      .setIssuedAt()
      .setExpirationTime(`${ACCESS_TOKEN_TTL_SECONDS}s`)
      .sign(this.#secret);
  }

  public async verify(token: string | undefined | null): Promise<AccessTokenClaims | null> {
    const bearer = stripBearer(token);

    if (!bearer) {
      return null;
    }

    try {
      const { payload } = await jwtVerify(bearer, this.#secret, {
        algorithms: ['HS256'],
        issuer: ISSUER,
        audience: AUDIENCE,
      });

      return typeof payload.sub === 'string' && typeof payload.sid === 'string'
        ? (payload as unknown as AccessTokenClaims)
        : null;
    } catch {
      return null;
    }
  }

  public async resolve(token: string | undefined | null): Promise<VerifiedCaller | null> {
    const claims = await this.verify(token);

    if (!claims) {
      return null;
    }

    const user = await this._cache.remember(CacheKeys.user(claims.sub), () =>
      this._db.dbUser.findUnique({
        where: { id: claims.sub },
        include: { preferences: true },
        omit: { passwordHash: true },
      }),
    );

    return { claims, user };
  }
}
