import type { EstablishmentId, UserId } from '@coaster/common';
import { DbService } from '@coaster/core/db';
import { Injectable } from '@nestjs/common';

@Injectable()
export class EstablishmentReadRepository {
  constructor(private readonly _db: DbService) {}

  public async findByUserId(userId: UserId) {
    return await this._db.dbEstablishment.findMany({
      where: {
        members: {
          some: { userId, active: true, deletedAt: null },
        },
      },
    });
  }

  public async findById(establishmentId: EstablishmentId) {
    return this._db.dbEstablishment.findUnique({ where: { id: establishmentId } });
  }
}
