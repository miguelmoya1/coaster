import type { BarId, ShiftExchangeId, ShiftId, UserId } from '@coaster/common';
import { Injectable } from '@nestjs/common';
import { ShiftExchangeStatus } from '../../core';
import { DbService } from '../../db';

@Injectable()
export class ShiftExchangesRepository {
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
