import type { BarId, ShiftId } from '@coaster/common';
import { Injectable } from '@nestjs/common';
import { DbService } from '../../core/db';

@Injectable()
export class ShiftsReadRepository {
  constructor(private readonly db: DbService) {}
  public async findByBarId(barId: BarId, startDate?: Date, endDate?: Date) {
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

  public async findById(shiftId: ShiftId) {
    return this.db.dbShift.findUnique({
      where: { id: shiftId },
    });
  }
}
