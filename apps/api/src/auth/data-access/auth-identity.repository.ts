import { DbAuthProvider, DbService } from '@coaster/core/db';
import { Injectable } from '@nestjs/common';

@Injectable()
export class AuthIdentityRepository {
  constructor(private readonly db: DbService) {}

  public async findUserBySubject(provider: DbAuthProvider, subject: string) {
    const identity = await this.db.dbAuthIdentity.findUnique({
      where: { provider_subject: { provider, subject } },
      include: { user: { include: { preferences: true } } },
    });

    return identity?.user ?? null;
  }

  public async touch(provider: DbAuthProvider, subject: string) {
    await this.db.dbAuthIdentity.update({
      where: { provider_subject: { provider, subject } },
      data: { lastLoginAt: new Date() },
    });
  }

  public async link(userId: string, provider: DbAuthProvider, subject: string, email: string) {
    await this.db.dbAuthIdentity.create({
      data: { userId, provider, subject, email, lastLoginAt: new Date() },
    });
  }
}
