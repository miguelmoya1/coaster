import type { ShiftExchangeId, ShiftId, UserId } from '@coaster/common';
import { ShiftExchangeStatus } from '@coaster/common';
import { Injectable } from '@nestjs/common';
import { DbService } from '../../core/db';

@Injectable()
export class ShiftExchangesWriteRepository {
  constructor(private readonly _db: DbService) {}

  public async createExchange(shiftId: ShiftId, requesterId: UserId, targetId?: UserId) {
    return this._db.dbShiftExchange.create({
      data: {
        shift: { connect: { id: shiftId } },
        requester: { connect: { id: requesterId } },
        ...(targetId ? { target: { connect: { id: targetId } } } : {}),
        status: ShiftExchangeStatus.PENDING,
      },
      include: {
        shift: true,
        requester: { select: { id: true, name: true } },
      },
    });
  }

  public async acceptExchangeAndSwapShift(exchangeId: ShiftExchangeId, shiftId: ShiftId, newUserId: UserId) {
    return this._db.$transaction([
      this._db.dbShiftExchange.update({
        where: { id: exchangeId },
        data: { status: ShiftExchangeStatus.APPROVED, targetId: newUserId },
        include: { shift: true, requester: { select: { id: true, name: true } } },
      }),
      this._db.dbShift.update({
        where: { id: shiftId },
        data: { userId: newUserId },
      }),
    ]);
  }

  public async deleteExchange(exchangeId: ShiftExchangeId) {
    return this._db.dbShiftExchange.delete({
      where: { id: exchangeId },
    });
  }
}
