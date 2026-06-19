import type { BarId, UserId } from '@coaster/common';
import { Injectable } from '@nestjs/common';
import { DbService } from '../../db';

@Injectable()
export class BarReadRepository {
  constructor(private readonly _db: DbService) {}

  public async findByUserId(userId: UserId) {
    return await this._db.dbBar.findMany({
      where: {
        members: {
          some: { userId },
        },
      },
    });
  }

  public async findById(barId: BarId) {
    return this._db.dbBar.findUnique({ where: { id: barId } });
  }

  public async searchBarsAsAdmin(query: string) {
    return this._db.dbBar.findMany({
      where: {
        OR: [
          { id: { equals: query } },
          { name: { contains: query, mode: 'insensitive' } },
        ],
      },
      take: 20,
    });
  }
}
