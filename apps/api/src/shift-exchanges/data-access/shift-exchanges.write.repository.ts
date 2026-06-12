import type { ShiftExchangeId, ShiftId, UserId } from '@coaster/common';
import { Injectable } from '@nestjs/common';
import { ShiftExchangeStatus } from '../../core';
import { DbService } from '../../db';

@Injectable()
export class ShiftExchangesWriteRepository {
  constructor(private readonly db: DbService) {}

  async createExchange(shiftId: ShiftId, requesterId: UserId, targetId?: UserId) {
    return this.db.dbShiftExchange.create({
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

  async acceptExchangeAndSwapShift(exchangeId: ShiftExchangeId, shiftId: ShiftId, newUserId: UserId) {
    return this.db.$transaction([
      this.db.dbShiftExchange.update({
        where: { id: exchangeId },
        data: { status: ShiftExchangeStatus.APPROVED, targetId: newUserId },
        include: { shift: true, requester: { select: { id: true, name: true } } },
      }),
      this.db.dbShift.update({
        where: { id: shiftId },
        data: { userId: newUserId },
      }),
    ]);
  }

  async deleteExchange(exchangeId: ShiftExchangeId) {
    return this.db.dbShiftExchange.delete({
      where: { id: exchangeId },
    });
  }
}
