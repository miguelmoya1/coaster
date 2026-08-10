import type { EstablishmentId, ShiftId } from '@coaster/common';
import { DbService } from '@coaster/core/db';
import { Injectable } from '@nestjs/common';

@Injectable()
export class ShiftsReadRepository {
  constructor(private readonly db: DbService) {}
  public async findByEstablishmentId(establishmentId: EstablishmentId, startDate?: Date, endDate?: Date) {
    return this.db.dbShift.findMany({
      where: {
        establishmentId,
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
