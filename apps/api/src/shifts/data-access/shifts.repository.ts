import { BarId, UserId } from '@coaster/common';
import { Injectable } from '@nestjs/common';
import { Prisma, PrismaService } from '../../core';

@Injectable()
export class ShiftsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async isUserMemberOfBar(userId: UserId, barId: BarId) {
    const member = await this.prisma.barMember.findUnique({
      where: {
        userId_barId: { userId, barId },
      },
      select: { active: true },
    });
    return !!member && member.active;
  }

  async create(barId: BarId, userId: UserId, createShiftDto: Omit<Prisma.ShiftCreateInput, 'bar' | 'user'>) {
    return this.prisma.shift.create({
      data: {
        ...createShiftDto,
        bar: { connect: { id: barId } },
        user: { connect: { id: userId } },
      },
      include: {
        user: { select: { id: true, name: true, photoUrl: true } },
      },
    });
  }

  async findByBarId(barId: BarId, startDate?: Date, endDate?: Date) {
    return this.prisma.shift.findMany({
      where: {
        barId,
        ...(startDate && endDate ? { startTime: { gte: startDate, lte: endDate } } : {}),
      },
      include: {
        user: { select: { id: true, name: true, photoUrl: true } },
      },
      orderBy: { startTime: 'asc' },
    });
  }

  async findById(shiftId: string) {
    return this.prisma.shift.findUnique({
      where: { id: shiftId },
    });
  }

  async delete(shiftId: string) {
    return this.prisma.shift.delete({
      where: { id: shiftId },
    });
  }
}
