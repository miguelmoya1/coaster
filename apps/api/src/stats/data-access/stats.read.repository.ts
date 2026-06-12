import type { BarId } from '@coaster/common';
import { Injectable } from '@nestjs/common';
import { DbService } from '../../db';

@Injectable()
export class StatsReadRepository {
  constructor(private readonly _prisma: DbService) {}

  async findClosedOrdersForStats(barId: BarId, startOfPrevYear: Date) {
    return this._prisma.dbOrder.findMany({
      where: {
        barId,
        status: 'CLOSED',
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
