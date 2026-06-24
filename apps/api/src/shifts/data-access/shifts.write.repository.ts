import type { BarId, ShiftId, UserId } from '@coaster/common';
import { Injectable } from '@nestjs/common';
import { DbService, DbShiftUncheckedCreateInput } from '../../core/db';

type CreateShiftDto = Omit<
  DbShiftUncheckedCreateInput,
  'id' | 'createdAt' | 'updatedAt' | 'barId' | 'userId' | 'exchange'
>;

@Injectable()
export class ShiftsWriteRepository {
  constructor(private readonly _db: DbService) {}

  public async create(barId: BarId, userId: UserId, createShiftDto: CreateShiftDto) {
    return this._db.dbShift.create({
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

  public async delete(shiftId: ShiftId) {
    return this._db.dbShift.delete({
      where: { id: shiftId },
    });
  }
}
