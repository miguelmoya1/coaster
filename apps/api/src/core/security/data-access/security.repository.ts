import { Injectable } from '@nestjs/common';
import { DbRole, DbService } from '../../db';

@Injectable()
export class SecurityRepository {
  constructor(private readonly _db: DbService) {}

  async getUserRole(userId: string): Promise<DbRole | undefined> {
    const user = await this._db.dbUser.findUnique({
      where: { id: userId },
      select: { role: true },
    });

    return user?.role;
  }

  async getBarMemberRole(
    userId: string,
    barId: string,
  ): Promise<{ role: string; active: boolean } | null> {
    const membership = await this._db.dbBarMember.findUnique({
      where: {
        userId_barId: {
          userId,
          barId,
        },
      },
      select: { role: true, active: true },
    });

    return membership;
  }
}
