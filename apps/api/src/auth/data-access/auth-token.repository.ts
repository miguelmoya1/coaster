import { DbAuthTokenPurpose, DbService } from '@coaster/core/db';
import { Injectable } from '@nestjs/common';
import { expiryFor, hashAuthToken, newAuthToken } from '../domain/auth-token';

@Injectable()
export class AuthTokenRepository {
  constructor(private readonly db: DbService) {}

  public async issue(userId: string, purpose: DbAuthTokenPurpose): Promise<string> {
    const token = newAuthToken();

    await this.db.$transaction([
      this.db.dbAuthToken.updateMany({
        where: { userId, purpose, usedAt: null },
        data: { usedAt: new Date() },
      }),
      this.db.dbAuthToken.create({
        data: {
          userId,
          purpose,
          tokenHash: hashAuthToken(token),
          expiresAt: expiryFor(purpose, new Date()),
        },
      }),
    ]);

    return token;
  }

  public async findUsable(token: string, purpose: DbAuthTokenPurpose) {
    const stored = await this.db.dbAuthToken.findUnique({
      where: { tokenHash: hashAuthToken(token) },
      include: { user: { include: { preferences: true } } },
    });

    if (!stored || stored.purpose !== purpose || stored.usedAt !== null || stored.expiresAt <= new Date()) {
      return null;
    }

    return stored;
  }

  public async spend(id: string): Promise<boolean> {
    const { count } = await this.db.dbAuthToken.updateMany({
      where: { id, usedAt: null },
      data: { usedAt: new Date() },
    });

    return count === 1;
  }
}
