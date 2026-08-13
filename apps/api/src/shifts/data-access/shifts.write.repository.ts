import type { EstablishmentId, ShiftId, UserId } from '@coaster/common';
import { DbService, DbShiftUncheckedCreateInput } from '@coaster/core/db';
import { Injectable } from '@nestjs/common';

type CreateShiftDto = Omit<
  DbShiftUncheckedCreateInput,
  'id' | 'createdAt' | 'updatedAt' | 'establishmentId' | 'userId' | 'exchange'
>;

@Injectable()
export class ShiftsWriteRepository {
  constructor(private readonly _db: DbService) {}

  public async create(establishmentId: EstablishmentId, userId: UserId, createShiftDto: CreateShiftDto) {
    return this._db.dbShift.create({
      data: {
        ...createShiftDto,
        establishment: { connect: { id: establishmentId } },
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
