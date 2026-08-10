import type { EstablishmentId } from '@coaster/common';
import { DbOrderStatus, DbService } from '@coaster/core/db';
import { Injectable } from '@nestjs/common';

@Injectable()
export class StatsReadRepository {
  constructor(private readonly _db: DbService) {}

  public async findClosedOrdersForStats(establishmentId: EstablishmentId, startOfPrevYear: Date) {
    return this._db.dbOrder.findMany({
      where: {
        establishmentId,
        status: DbOrderStatus.CLOSED,
        createdAt: { gte: startOfPrevYear },
      },
      select: {
        amountPaidCash: true,
        amountPaidCard: true,
        tipAmount: true,
        createdAt: true,
      },
      orderBy: {
        createdAt: 'asc',
      },
    });
  }
}
