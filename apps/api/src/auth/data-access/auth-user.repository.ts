import { CacheKeys, CacheService } from '@coaster/core';
import { DbService, DbUserUncheckedUpdateInput } from '@coaster/core/db';
import { Injectable } from '@nestjs/common';

@Injectable()
export class AuthUserRepository {
  constructor(
    private readonly db: DbService,
    private readonly cache: CacheService,
  ) {}

  public findById(userId: string) {
    return this.db.dbUser.findUnique({ where: { id: userId }, include: { preferences: true } });
  }

  public findByEmail(email: string) {
    return this.db.dbUser.findUnique({
      where: { email: email.trim().toLowerCase() },
      include: { preferences: true, identities: true },
    });
  }

  public async update(userId: string, data: DbUserUncheckedUpdateInput) {
    const user = await this.db.dbUser.update({ where: { id: userId }, data, include: { preferences: true } });

    await this.cache.forget(CacheKeys.user(userId));

    return user;
  }
}
