import type { UserId } from '@coaster/common';
import { Injectable } from '@nestjs/common';
import { DbBarRole, DbBarUncheckedCreateInput, DbService } from '../../db';

type CreateBarDto = Omit<
  DbBarUncheckedCreateInput,
  'id' | 'createdAt' | 'updatedAt' | 'members' | 'shifts' | 'categories' | 'tables' | 'orders'
>;

@Injectable()
export class BarWriteRepository {
  constructor(private readonly _db: DbService) {}

  public async create(userId: UserId, createBarDto: CreateBarDto) {
    return this._db.dbBar.create({
      data: {
        ...createBarDto,
        members: { create: { userId, role: DbBarRole.OWNER } },
      },
    });
  }
}
