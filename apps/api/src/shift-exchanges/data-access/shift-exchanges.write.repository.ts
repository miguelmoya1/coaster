import type { ShiftExchangeId, ShiftId, UserId } from '@coaster/common';
import { ShiftExchangeStatus } from '@coaster/common';
import { DbService } from '@coaster/core/db';
import { Injectable } from '@nestjs/common';

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

  /**
   * Claiming the offer and handing over the shift happen together, and only if the offer is still
   * pending when the write lands. Two people tapping accept at once used to end with both of them
   * told they got the shift.
   */
  public async acceptExchangeAndSwapShift(exchangeId: ShiftExchangeId, shiftId: ShiftId, newUserId: UserId) {
    return this._db.$transaction(async (tx) => {
      const claimed = await tx.dbShiftExchange.updateMany({
        where: { id: exchangeId, status: ShiftExchangeStatus.PENDING },
        data: { status: ShiftExchangeStatus.APPROVED, targetId: newUserId },
      });

      if (claimed.count === 0) {
        return false;
      }

      await tx.dbShift.update({ where: { id: shiftId }, data: { userId: newUserId } });

      return true;
    });
  }

  public async deleteExchange(exchangeId: ShiftExchangeId) {
    return this._db.dbShiftExchange.delete({
      where: { id: exchangeId },
    });
  }
}
