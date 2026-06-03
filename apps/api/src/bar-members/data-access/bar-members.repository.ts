import type { BarId, BarMemberId, UserId } from '@coaster/common';
import { Injectable } from '@nestjs/common';
import { DbBarMemberCreateInput, DbService } from '../../db';

@Injectable()
export class BarMembersRepository {
  constructor(private readonly db: DbService) {}

  async isMember(barId: BarId, email: string) {
    return this.db.dbBarMember.findFirst({
      where: {
        barId,
        user: { email },
      },
    });
  }

  async findBarById(barId: BarId) {
    return this.db.dbBar.findUnique({ where: { id: barId } });
  }

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

  async getMembersByBar(barId: BarId) {
    return this.db.dbBarMember.findMany({
      where: { barId, active: true },
      include: {
        user: {
          select: { id: true, name: true, email: true, photoUrl: true },
        },
      },
    });
  }

  async getMemberByUserAndBar(userId: UserId, barId: BarId) {
    return this.db.dbBarMember.findUnique({
      where: {
        userId_barId: {
          userId,
          barId,
        },
      },
      include: {
        user: {
          select: { id: true, name: true, email: true, photoUrl: true },
        },
      },
    });
  }

  async removeMember(memberId: BarMemberId) {
    return this.db.dbBarMember.delete({
      where: { id: memberId },
    });
  }
}
