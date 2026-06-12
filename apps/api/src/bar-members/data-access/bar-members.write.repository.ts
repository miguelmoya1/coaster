import type { BarId, BarMemberId, UserId } from '@coaster/common';
import { Injectable } from '@nestjs/common';
import { DbBarMemberCreateInput, DbService } from '../../db';

@Injectable()
export class BarMembersWriteRepository {
  constructor(private readonly db: DbService) {}

  async inviteMember(barId: BarId, userId: UserId, createBarMemberDto: Omit<DbBarMemberCreateInput, 'bar' | 'user'>) {
    return this.db.dbBarMember.create({
      data: {
        ...createBarMemberDto,
        bar: { connect: { id: barId } },
        user: { connect: { id: userId } },
      },
      include: {
        user: { select: { email: true, name: true } },
        bar: { select: { name: true } },
      },
    });
  }

  async removeMember(memberId: BarMemberId) {
    return this.db.dbBarMember.delete({
      where: { id: memberId },
    });
  }
}
