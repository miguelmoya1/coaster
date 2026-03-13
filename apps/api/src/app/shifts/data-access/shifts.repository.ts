import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../core';
import { BarId, ShiftType, UserId } from '@coaster/interfaces';

@Injectable()
export class ShiftsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async isUserMemberOfBar(userId: UserId, barId: BarId): Promise<boolean> {
    const member = await this.prisma.barMember.findUnique({
      where: {
        userId_barId: { userId, barId },
      },
      select: { active: true },
    });
    return !!member && member.active;
  }

  async create(
    barId: BarId,
    userId: UserId,
    date: Date,
    type: ShiftType,
    notes?: string,
  ) {
    return this.prisma.shift.create({
      data: {
        barId,
        userId,
        date,
        type,
        notes,
      },
      include: {
        user: { select: { id: true, name: true } },
      },
    });
  }

  async findByBarId(barId: BarId, startDate?: Date, endDate?: Date) {
    return this.prisma.shift.findMany({
      where: {
        barId,
        ...(startDate && endDate
          ? { date: { gte: startDate, lte: endDate } }
          : {}),
      },
      include: {
        user: { select: { id: true, name: true } },
      },
      orderBy: { date: 'asc' },
    });
  }
}
