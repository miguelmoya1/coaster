import type { EstablishmentId, UserId } from '@coaster/common';
import { DbRole, DbService, DbSubscriptionPlan } from '@coaster/core/db';
import { Injectable } from '@nestjs/common';

export interface ManualGrantInput {
  plan: DbSubscriptionPlan;
  expiresAt: Date | null;
  reason: string | null;
  grantedById: UserId;
}

@Injectable()
export class AdminWriteRepository {
  constructor(private readonly _db: DbService) {}

  public grantPlan(establishmentId: EstablishmentId, grant: ManualGrantInput) {
    const data = {
      manualPlan: grant.plan,
      manualGrantExpiresAt: grant.expiresAt,
      manualGrantReason: grant.reason,
      manualGrantedById: grant.grantedById,
      manualGrantedAt: new Date(),
    };

    return this._db.dbEstablishmentSubscription.upsert({
      where: { establishmentId },
      create: { establishmentId, ...data },
      update: data,
    });
  }

  public revokePlan(establishmentId: EstablishmentId) {
    return this._db.dbEstablishmentSubscription.update({
      where: { establishmentId },
      data: {
        manualPlan: null,
        manualGrantExpiresAt: null,
        manualGrantReason: null,
        manualGrantedById: null,
        manualGrantedAt: null,
      },
    });
  }

  public renameEstablishment(establishmentId: EstablishmentId, name: string) {
    return this._db.dbEstablishment.update({ where: { id: establishmentId }, data: { name } });
  }

  public updateUser(userId: UserId, data: { role?: DbRole; active?: boolean }) {
    return this._db.dbUser.update({ where: { id: userId }, data });
  }

  public findSubscription(establishmentId: EstablishmentId) {
    return this._db.dbEstablishmentSubscription.findUnique({ where: { establishmentId } });
  }
}
