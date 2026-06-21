import type { BarId } from '@coaster/common';
import { Injectable } from '@nestjs/common';
import { DbService } from '../../core/db';

@Injectable()
export class CategoriesReadRepository {
  constructor(private readonly _db: DbService) {}

  public async findByBarId(barId: BarId) {
    return this._db.dbCategory.findMany({
      where: { barId, deletedAt: null },
      orderBy: { name: 'asc' },
    });
  }
}
