import type { EstablishmentId, UserId } from '@coaster/common';
import { DbEstablishmentRole, DbService } from '@coaster/core/db';
import { Injectable } from '@nestjs/common';

@Injectable()
export class FichitRepository {
  constructor(private readonly _db: DbService) {}

  public async establishment(establishmentId: EstablishmentId) {
    return this._db.dbEstablishment.findUnique({
      where: { id: establishmentId },
      select: {
        id: true,
        name: true,
        taxId: true,
        fichitCompanyId: true,
        fichitClockingSince: true,
      },
    });
  }

  public async owner(establishmentId: EstablishmentId) {
    const member = await this._db.dbEstablishmentMember.findFirst({
      where: { establishmentId, role: DbEstablishmentRole.OWNER, deletedAt: null },
      orderBy: { createdAt: 'asc' },
      select: { user: { select: { name: true, email: true } } },
    });
    return member?.user ?? null;
  }

  public async linkCompany(establishmentId: EstablishmentId, fichitCompanyId: string) {
    await this._db.dbEstablishment.update({
      where: { id: establishmentId },
      data: { fichitCompanyId },
    });
  }

  public async moveClocking(establishmentId: EstablishmentId, since: Date | null) {
    await this._db.dbEstablishment.update({
      where: { id: establishmentId },
      data: { fichitClockingSince: since },
    });
  }

  public async member(establishmentId: EstablishmentId, userId: UserId) {
    return this._db.dbEstablishmentMember.findUnique({
      where: { userId_establishmentId: { userId, establishmentId } },
      select: {
        id: true,
        userId: true,
        deletedAt: true,
        fichitEmployeeId: true,
        user: { select: { name: true, email: true } },
      },
    });
  }

  public async linkEmployee(memberId: string, fichitEmployeeId: string) {
    await this._db.dbEstablishmentMember.update({
      where: { id: memberId },
      data: { fichitEmployeeId },
    });
  }

  public async shift(shiftId: string) {
    return this._db.dbShift.findUnique({
      where: { id: shiftId },
      select: {
        id: true,
        establishmentId: true,
        userId: true,
        startTime: true,
        endTime: true,
        notes: true,
        fichitShiftId: true,
      },
    });
  }

  public async linkShift(shiftId: string, fichitShiftId: string | null) {
    await this._db.dbShift.update({
      where: { id: shiftId },
      data: { fichitShiftId },
    });
  }

  public async establishmentsWithoutCompany(limit: number) {
    return this._db.dbEstablishment.findMany({
      where: { fichitCompanyId: null },
      orderBy: { createdAt: 'asc' },
      take: limit,
      select: { id: true },
    });
  }

  public async membersWithoutEmployee(limit: number) {
    return this._db.dbEstablishmentMember.findMany({
      where: { fichitEmployeeId: null, deletedAt: null, establishment: { fichitCompanyId: { not: null } } },
      orderBy: { createdAt: 'asc' },
      take: limit,
      select: { establishmentId: true, userId: true },
    });
  }
}
