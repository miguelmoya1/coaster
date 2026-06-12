import type { BarId, UserId } from '@coaster/common';
import { Injectable } from '@nestjs/common';
import { DbService } from '../../db';

@Injectable()
export class ShiftsReadRepository {
  constructor(private readonly db: DbService) {}

  async isUserMemberOfBar(userId: UserId, barId: BarId) {
    const member = await this.db.dbBarMember.findUnique({
      where: {
        userId_barId: { userId, barId },
      },
      select: { active: true },
    });
    return !!member && member.active;
  }

  async findByBarId(barId: BarId, startDate?: Date, endDate?: Date) {
    return this.db.dbShift.findMany({
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
    return this.db.dbShift.findUnique({
      where: { id: shiftId },
    });
  }
}
