import type { BarId } from '@coaster/common';
import { Injectable } from '@nestjs/common';
import { DbService } from '../../db';

@Injectable()
export class CategoriesReadRepository {
  constructor(private readonly _prisma: DbService) {}

  async findByBarId(barId: BarId) {
    return this._prisma.dbCategory.findMany({
      where: { barId },
      orderBy: { name: 'asc' },
    });
  }
}
