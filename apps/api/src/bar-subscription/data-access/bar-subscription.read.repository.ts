import type { BarId } from '@coaster/common';
import { Injectable } from '@nestjs/common';
import { DbService } from '../../core/db';

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
