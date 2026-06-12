import type { BarRole, UserId } from '@coaster/common';
import { Injectable } from '@nestjs/common';
import { DbBarCreateInput, DbService } from '../../db';

@Injectable()
export class BarWriteRepository {
  constructor(private readonly _prisma: DbService) {}

  async create(userId: UserId, createBarDto: DbBarCreateInput) {
    return this._prisma.dbBar.create({
      data: {
        ...createBarDto,
        members: { create: { userId, role: 'OWNER' as BarRole } },
      },
    });
  }
}
