import type { BarId, ShiftExchangeId, ShiftId } from '@coaster/common';
import { Injectable } from '@nestjs/common';
import { ShiftExchangeStatus } from '../../core';
import { DbService } from '../../db';

@Injectable()
export class ShiftExchangesReadRepository {
  constructor(private readonly _db: DbService) {}

  public async getShiftById(shiftId: ShiftId) {
    return this._db.dbShift.findUnique({ where: { id: shiftId } });
  }

  public async getExchangeById(exchangeId: ShiftExchangeId) {
    return this._db.dbShiftExchange.findUnique({
      where: { id: exchangeId },
      include: { shift: true },
    });
  }

  public async hasPendingExchangeForShift(shiftId: ShiftId) {
    const count = await this._db.dbShiftExchange.count({
      where: {
        shiftId,
        status: ShiftExchangeStatus.PENDING,
      },
    });
    return count > 0;
  }

  public async findPendingByBarId(barId: BarId) {
    const startInstant = Temporal.Now.zonedDateTimeISO('UTC').startOfDay().toInstant();
    const today = new Date(startInstant.epochMilliseconds);

    return this._db.dbShiftExchange.findMany({
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
