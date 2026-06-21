import type { BarId, UserId } from '@coaster/common';
import { Injectable } from '@nestjs/common';
import { DbService } from '../../core/db';

@Injectable()
export class BarMembersReadRepository {
  constructor(private readonly db: DbService) {}

  public async isMember(barId: BarId, email: string) {
    return this.db.dbBarMember.findFirst({
      where: {
        barId,
        user: { email },
        deletedAt: null,
      },
    });
  }

  public async findBarById(barId: BarId) {
    return this.db.dbBar.findUnique({ where: { id: barId } });
  }

  public async getMembersByBar(barId: BarId) {
    return this.db.dbBarMember.findMany({
      where: { barId, active: true, deletedAt: null },
      include: {
        user: {
          select: { id: true, name: true, email: true, photoUrl: true },
        },
      },
    });
  }

  public async getMemberByUserAndBar(userId: UserId, barId: BarId) {
    return this.db.dbBarMember.findFirst({
      where: {
        userId,
        barId,
        deletedAt: null,
      },
      include: {
        user: {
          select: { id: true, name: true, email: true, photoUrl: true },
        },
      },
    });
  }
}
