import { Injectable } from '@nestjs/common';
import { getAuth } from 'firebase-admin/auth';
import type { DecodedIdToken } from 'firebase-admin/auth';
import type { DbUserWithPreferences } from '../../mappers/users.mapper';
import { CacheKeys } from '../../cache/cache-keys';
import { CacheService } from '../../cache/cache.service';
import { DbService } from '../../db';

export interface VerifiedCaller {
  decoded: DecodedIdToken;
  user: DbUserWithPreferences | null;
}

export const stripBearer = (value: string | undefined | null): string | null => {
  if (typeof value !== 'string' || value.length === 0) {
    return null;
  }

  return value.replace(/^Bearer\s+/i, '') || null;
};

@Injectable()
export class FirebaseTokenService {
  constructor(
    private readonly _db: DbService,
    private readonly _cache: CacheService,
  ) {}

  async resolve(token: string | undefined | null): Promise<VerifiedCaller | null> {
    const bearer = stripBearer(token);

    if (!bearer) {
      return null;
    }

    let decoded: DecodedIdToken;

    try {
      decoded = await getAuth().verifyIdToken(bearer);
    } catch {
      return null;
    }

    if (!decoded?.sub) {
      return null;
    }

    const user = await this._cache.remember(CacheKeys.userByGoogleId(decoded.sub), () =>
      this._db.dbUser.findUnique({
        where: { googleId: decoded.sub },
        include: { preferences: true },
      }),
    );

    return { decoded, user };
  }
}
