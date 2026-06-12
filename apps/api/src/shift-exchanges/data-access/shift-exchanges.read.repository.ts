import type { BarId, ShiftExchangeId, ShiftId } from '@coaster/common';
import { Injectable } from '@nestjs/common';
import { ShiftExchangeStatus } from '../../core';
import { DbService } from '../../db';

@Injectable()
export class ShiftExchangesReadRepository {
  constructor(private readonly db: DbService) {}

  async getShiftById(shiftId: ShiftId) {
    return this.db.dbShift.findUnique({ where: { id: shiftId } });
  }

  async getExchangeById(exchangeId: ShiftExchangeId) {
    return this.db.dbShiftExchange.findUnique({
      where: { id: exchangeId },
      include: { shift: true },
    });
  }

  async hasPendingExchangeForShift(shiftId: ShiftId) {
    const count = await this.db.dbShiftExchange.count({
      where: {
        shiftId,
        status: ShiftExchangeStatus.PENDING,
      },
    });
    return count > 0;
  }

  async findPendingByBarId(barId: BarId) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return this.db.dbShiftExchange.findMany({
      where: {
        status: ShiftExchangeStatus.PENDING,
        shift: {
          barId: barId,
          startTime: { gte: today },
        },
      },
      include: {
        shift: true,
        requester: { select: { id: true, name: true } },
      },
      orderBy: { shift: { startTime: 'asc' } },
    });
  }
}
