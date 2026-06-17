import type { BarId } from '@coaster/common';
import { Injectable } from '@nestjs/common';
import { DbOrderStatus, DbService } from '../../db';

@Injectable()
export class StatsReadRepository {
  constructor(private readonly _db: DbService) {}

  public async findClosedOrdersForStats(barId: BarId, startOfPrevYear: Date) {
    return this._db.dbOrder.findMany({
      where: {
        barId,
        status: DbOrderStatus.CLOSED,
        createdAt: { gte: startOfPrevYear },
      },
      select: {
        totalAmount: true,
        createdAt: true,
      },
      orderBy: {
        createdAt: 'asc',
      },
    });
  }
}
