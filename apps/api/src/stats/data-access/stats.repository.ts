import type { BarId } from '@coaster/common';
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../core';

@Injectable()
export class StatsRepository {
  constructor(private readonly _prisma: PrismaService) {}

  async findClosedOrdersForStats(barId: BarId, startOfPrevYear: Date) {
    return this._prisma.order.findMany({
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
