import type { BarId, UserId } from '@coaster/common';
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

  public grantPlan(barId: BarId, grant: ManualGrantInput) {
    const data = {
      manualPlan: grant.plan,
      manualGrantExpiresAt: grant.expiresAt,
      manualGrantReason: grant.reason,
      manualGrantedById: grant.grantedById,
      manualGrantedAt: new Date(),
    };

    return this._db.dbBarSubscription.upsert({
      where: { barId },
      create: { barId, ...data },
      update: data,
    });
  }

  public revokePlan(barId: BarId) {
    return this._db.dbBarSubscription.update({
      where: { barId },
      data: {
        manualPlan: null,
        manualGrantExpiresAt: null,
        manualGrantReason: null,
        manualGrantedById: null,
        manualGrantedAt: null,
      },
    });
  }

  public renameBar(barId: BarId, name: string) {
    return this._db.dbBar.update({ where: { id: barId }, data: { name } });
  }


  public updateUser(userId: UserId, data: { role?: DbRole; active?: boolean }) {
    return this._db.dbUser.update({ where: { id: userId }, data });
  }

  public findSubscription(barId: BarId) {
    return this._db.dbBarSubscription.findUnique({ where: { barId } });
  }
}
