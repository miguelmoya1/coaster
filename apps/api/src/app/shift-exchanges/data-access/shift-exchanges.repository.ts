import {
  BarId,
  ShiftExchangeId,
  ShiftExchangeStatus,
  ShiftId,
  UserId,
} from '@coaster/interfaces';
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

  async createExchange(
    shiftId: ShiftId,
    requesterId: UserId,
    targetId?: UserId,
  ) {
    return this.prisma.shiftExchange.create({
      data: {
        shift: { connect: { id: shiftId } },
        requester: { connect: { id: requesterId } },
        target: { connect: { id: targetId } },
        status: ShiftExchangeStatus.PENDING,
      },
    });
  }

  async findPendingByBarId(barId: BarId) {
    return this.prisma.shiftExchange.findMany({
      where: {
        status: ShiftExchangeStatus.PENDING,
        shift: { barId: barId },
      },
      include: {
        shift: true,
        requester: { select: { id: true, name: true } },
      },
    });
  }

  async acceptExchangeAndSwapShift(
    exchangeId: ShiftExchangeId,
    shiftId: ShiftId,
    newUserId: UserId,
  ) {
    return this.prisma.$transaction([
      this.prisma.shiftExchange.update({
        where: { id: exchangeId },
        data: { status: ShiftExchangeStatus.APPROVED, targetId: newUserId },
        include: { shift: true },
      }),
      this.prisma.shift.update({
        where: { id: shiftId },
        data: { userId: newUserId },
      }),
    ]);
  }
}
