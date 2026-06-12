import type { BarId, UserId } from '@coaster/common';
import { Injectable } from '@nestjs/common';
import { DbService } from '../../db';

@Injectable()
export class BarReadRepository {
  constructor(private readonly _prisma: DbService) {}

  async findByUserId(userId: UserId) {
    const barMembers = await this._prisma.dbBarMember.findMany({
      where: { userId },
      include: { bar: true },
    });

    return barMembers.map((barMember) => barMember.bar);
  }

  async findById(barId: BarId) {
    return this._prisma.dbBar.findUnique({ where: { id: barId } });
  }
}
