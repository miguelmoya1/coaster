import type { BarId, UserId } from '@coaster/common';
import { Injectable } from '@nestjs/common';
import { DbService } from '../../db';

@Injectable()
export class BarMembersReadRepository {
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
}
