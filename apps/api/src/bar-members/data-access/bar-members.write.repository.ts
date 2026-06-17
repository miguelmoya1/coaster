import type { BarId, BarMemberId, UserId } from '@coaster/common';
import { Injectable } from '@nestjs/common';
import { DbBarMemberUncheckedCreateInput, DbService } from '../../db';

type CreateBarMemberDto = Omit<DbBarMemberUncheckedCreateInput, 'id' | 'barId' | 'userId' | 'createdAt' | 'updatedAt'>;

@Injectable()
export class BarMembersWriteRepository {
  constructor(private readonly _db: DbService) {}

  public async invite(barId: BarId, userId: UserId, createBarMemberDto: CreateBarMemberDto) {
    return this._db.dbBarMember.create({
      data: {
        ...createBarMemberDto,
        barId,
        userId,
      },
      include: {
        user: { select: { email: true, name: true } },
        bar: { select: { name: true } },
      },
    });
  }

  public async delete(barId: BarId, barMemberId: BarMemberId) {
    const deleted = await this._db.dbBarMember.deleteMany({
      where: {
        id: barMemberId,
        barId,
      },
    });

    return deleted.count > 0;
  }
}
