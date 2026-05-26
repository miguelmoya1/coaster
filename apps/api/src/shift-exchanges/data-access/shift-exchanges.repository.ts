import { BarId, ShiftExchangeId, ShiftExchangeStatus, ShiftId, UserId } from '@coaster/common';
import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../core';

@Injectable()
export class ShiftExchangesRepository {
  constructor(private readonly prisma: PrismaService) {}

  async getShiftById(shiftId: ShiftId) {
    return this.prisma.shift.findUnique({ where: { id: shiftId } });
  }

  async getExchangeById(exchangeId: ShiftExchangeId) {
    return this.prisma.shiftExchange.findUnique({
      where: { id: exchangeId },
      include: { shift: true },
    });
  }

  async createExchange(shiftId: ShiftId, requesterId: UserId, targetId?: UserId) {
    return this.prisma.shiftExchange.create({
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

  async hasPendingExchangeForShift(shiftId: ShiftId): Promise<boolean> {
    const count = await this.prisma.shiftExchange.count({
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

    return this.prisma.shiftExchange.findMany({
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
    return this.prisma.$transaction([
      this.prisma.shiftExchange.update({
        where: { id: exchangeId },
        data: { status: ShiftExchangeStatus.APPROVED, targetId: newUserId },
        include: { shift: true, requester: { select: { id: true, name: true } } },
      }),
      this.prisma.shift.update({
        where: { id: shiftId },
        data: { userId: newUserId },
      }),
    ]);
  }
}
