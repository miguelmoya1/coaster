import type { BarId, UserId } from '@coaster/common';
import { DbService } from '@coaster/core/db';
import { Injectable } from '@nestjs/common';

@Injectable()
export class BarReadRepository {
  constructor(private readonly _db: DbService) {}

  public async findByUserId(userId: UserId) {
    return await this._db.dbBar.findMany({
      where: {
        members: {
          some: { userId, active: true, deletedAt: null },
        },
      },
    });
  }

  public async findById(barId: BarId) {
    return this._db.dbBar.findUnique({ where: { id: barId } });
  }

}
