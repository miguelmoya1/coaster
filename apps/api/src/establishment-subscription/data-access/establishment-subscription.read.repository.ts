import type { EstablishmentId } from '@coaster/common';
import { DbService } from '@coaster/core/db';
import { Injectable } from '@nestjs/common';

@Injectable()
export class EstablishmentSubscriptionReadRepository {
  constructor(private readonly _db: DbService) {}

  public findByEstablishmentId(establishmentId: EstablishmentId) {
    return this._db.dbEstablishmentSubscription.findUnique({
      where: { establishmentId },
    });
  }

  public findByStripeCustomerId(stripeCustomerId: string) {
    return this._db.dbEstablishmentSubscription.findUnique({
      where: { stripeCustomerId },
    });
  }

  public findByStripeSubscriptionId(stripeSubscriptionId: string) {
    return this._db.dbEstablishmentSubscription.findUnique({
      where: { stripeSubscriptionId },
    });
  }

  public async countBillableSeats(establishmentId: EstablishmentId): Promise<number> {
    const members = await this._db.dbEstablishmentMember.count({
      where: { establishmentId, active: true, deletedAt: null },
    });

    return Math.max(members, 1);
  }
}
