import type { EstablishmentId, EstablishmentMemberId, UserId } from '@coaster/common';
import { DbEstablishmentMemberUncheckedCreateInput, DbEstablishmentRole, DbService } from '@coaster/core/db';
import { Injectable } from '@nestjs/common';

type CreateEstablishmentMemberDto = Omit<
  DbEstablishmentMemberUncheckedCreateInput,
  'id' | 'establishmentId' | 'userId' | 'createdAt' | 'updatedAt'
>;

@Injectable()
export class EstablishmentMembersWriteRepository {
  constructor(private readonly _db: DbService) {}

  public async invite(
    establishmentId: EstablishmentId,
    userId: UserId,
    createEstablishmentMemberDto: CreateEstablishmentMemberDto,
  ) {
    return this._db.dbEstablishmentMember.upsert({
      where: {
        userId_establishmentId: {
          userId,
          establishmentId,
        },
      },
      create: {
        ...createEstablishmentMemberDto,
        establishmentId,
        userId,
      },
      update: {
        ...createEstablishmentMemberDto,
        deletedAt: null,
      },
      include: {
        user: { select: { email: true, name: true } },
        establishment: { select: { name: true } },
      },
    });
  }

  public async updateRole(
    establishmentId: EstablishmentId,
    establishmentMemberId: EstablishmentMemberId,
    role: DbEstablishmentRole,
  ) {
    const updated = await this._db.dbEstablishmentMember.updateMany({
      where: { id: establishmentMemberId, establishmentId, deletedAt: null },
      data: { role },
    });

    return updated.count > 0;
  }

  public async delete(establishmentId: EstablishmentId, establishmentMemberId: EstablishmentMemberId) {
    const deleted = await this._db.dbEstablishmentMember.updateMany({
      where: {
        id: establishmentMemberId,
        establishmentId,
      },
      data: {
        deletedAt: new Date(),
      },
    });

    return deleted.count > 0;
  }
}
