import type { BarId, UserId } from '@coaster/common';
import { Injectable } from '@nestjs/common';
import { DbService, DbShiftCreateInput } from '../../db';

@Injectable()
export class ShiftsWriteRepository {
  constructor(private readonly db: DbService) {}

  async create(barId: BarId, userId: UserId, createShiftDto: Omit<DbShiftCreateInput, 'bar' | 'user'>) {
    return this.db.dbShift.create({
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

  async delete(shiftId: string) {
    return this.db.dbShift.delete({
      where: { id: shiftId },
    });
  }
}
