import type { EstablishmentId, UserId } from '@coaster/common';
import { DbService } from '@coaster/core/db';
import { Injectable } from '@nestjs/common';

@Injectable()
export class EstablishmentMembersReadRepository {
  constructor(private readonly db: DbService) {}

  public async isMember(establishmentId: EstablishmentId, email: string) {
    return this.db.dbEstablishmentMember.findFirst({
      where: {
        establishmentId,
        user: { email },
        deletedAt: null,
      },
    });
  }

  public async findEstablishmentById(establishmentId: EstablishmentId) {
    return this.db.dbEstablishment.findUnique({ where: { id: establishmentId } });
  }

  public async getMembersByEstablishment(establishmentId: EstablishmentId) {
    return this.db.dbEstablishmentMember.findMany({
      where: { establishmentId, active: true, deletedAt: null },
      include: {
        user: {
          select: { id: true, name: true, email: true, photoUrl: true },
        },
      },
    });
  }

  public async getMemberByUserAndEstablishment(userId: UserId, establishmentId: EstablishmentId) {
    return this.db.dbEstablishmentMember.findFirst({
      where: {
        userId,
        establishmentId,
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
