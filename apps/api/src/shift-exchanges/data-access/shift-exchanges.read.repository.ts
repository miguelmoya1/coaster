import type { EstablishmentId, ShiftExchangeId, ShiftId } from '@coaster/common';
import { ESTABLISHMENT_TIME_ZONE, ShiftExchangeStatus } from '@coaster/common';
import { DbService } from '@coaster/core/db';
import { Injectable } from '@nestjs/common';

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

  public async findPendingByEstablishmentId(establishmentId: EstablishmentId) {
    const startInstant = Temporal.Now.zonedDateTimeISO(ESTABLISHMENT_TIME_ZONE).startOfDay().toInstant();
    const today = new Date(startInstant.epochMilliseconds);

    return this._db.dbShiftExchange.findMany({
      where: {
        status: ShiftExchangeStatus.PENDING,
        shift: {
          establishmentId: establishmentId,
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

  public async getEstablishmentMember(userId: string, establishmentId: string) {
    return this._db.dbEstablishmentMember.findUnique({
      where: {
        userId_establishmentId: {
          userId,
          establishmentId,
        },
        deletedAt: null,
      },
      select: { role: true, active: true },
    });
  }
}
