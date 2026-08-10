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

  async getEstablishmentMemberRole(
    userId: string,
    establishmentId: string,
  ): Promise<{ role: string; active: boolean } | null> {
    const membership = await this._db.dbEstablishmentMember.findUnique({
      where: {
        userId_establishmentId: {
          userId,
          establishmentId,
        },
        deletedAt: null,
      },
      select: { role: true, active: true },
    });

    return membership;
  }
}
