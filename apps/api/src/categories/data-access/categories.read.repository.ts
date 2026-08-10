import type { EstablishmentId } from '@coaster/common';
import { DbService } from '@coaster/core/db';
import { Injectable } from '@nestjs/common';

@Injectable()
export class CategoriesReadRepository {
  constructor(private readonly _db: DbService) {}

  public async findByEstablishmentId(establishmentId: EstablishmentId) {
    return this._db.dbCategory.findMany({
      where: { establishmentId, deletedAt: null },
      orderBy: { name: 'asc' },
    });
  }
}
