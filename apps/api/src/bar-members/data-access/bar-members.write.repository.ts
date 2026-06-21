import type { BarId, BarMemberId, UserId } from '@coaster/common';
import { Injectable } from '@nestjs/common';
import { DbBarMemberUncheckedCreateInput, DbService } from '../../core/db';

type CreateBarMemberDto = Omit<DbBarMemberUncheckedCreateInput, 'id' | 'barId' | 'userId' | 'createdAt' | 'updatedAt'>;

@Injectable()
export class BarMembersWriteRepository {
  constructor(private readonly _db: DbService) {}

  public async invite(barId: BarId, userId: UserId, createBarMemberDto: CreateBarMemberDto) {
    return this._db.dbBarMember.upsert({
      where: {
        userId_barId: {
          userId,
          barId,
        },
      },
      create: {
        ...createBarMemberDto,
        barId,
        userId,
      },
      update: {
        ...createBarMemberDto,
        deletedAt: null,
      },
      include: {
        user: { select: { email: true, name: true } },
        bar: { select: { name: true } },
      },
    });
  }

  public async delete(barId: BarId, barMemberId: BarMemberId) {
    const deleted = await this._db.dbBarMember.updateMany({
      where: {
        id: barMemberId,
        barId,
      },
      data: {
        deletedAt: new Date(),
      },
    });

    return deleted.count > 0;
  }
}
