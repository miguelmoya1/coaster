import type { BarId } from '@coaster/common';
import { DbService } from '@coaster/core/db';
import { Injectable } from '@nestjs/common';

@Injectable()
export class BarSubscriptionReadRepository {
  constructor(private readonly _db: DbService) {}

  public findByBarId(barId: BarId) {
    return this._db.dbBarSubscription.findUnique({
      where: { barId },
    });
  }

  public findByStripeCustomerId(stripeCustomerId: string) {
    return this._db.dbBarSubscription.findUnique({
      where: { stripeCustomerId },
    });
  }

  public findByStripeSubscriptionId(stripeSubscriptionId: string) {
    return this._db.dbBarSubscription.findUnique({
      where: { stripeSubscriptionId },
    });
  }
}
