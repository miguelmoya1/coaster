import type { BarId } from '@coaster/common';
import { Injectable } from '@nestjs/common';
import { DbService } from '../../core/db';

@Injectable()
export class BillingReadRepository {
  constructor(private readonly _db: DbService) {}

  public async findSubscriptionByBarId(barId: BarId) {
    return this._db.dbBarSubscription.findUnique({
      where: { barId },
    });
  }

  public async findSubscriptionByStripeIds(stripeSubscriptionId: string, stripeCustomerId: string) {
    const bySub = await this._db.dbBarSubscription.findFirst({
      where: { stripeSubscriptionId },
    });

    if (bySub) {
      return bySub;
    }

    return this._db.dbBarSubscription.findFirst({
      where: { stripeCustomerId },
    });
  }

  public async findSubscriptionsByStripeIds(subscriptionId?: string | null, customerId?: string | null) {
    if (!subscriptionId && !customerId) {
      return [];
    }

    const where = subscriptionId ? { stripeSubscriptionId: subscriptionId } : { stripeCustomerId: customerId! };

    return this._db.dbBarSubscription.findMany({
      where,
      select: { barId: true },
    });
  }

  public async findWebhookEventById(stripeEventId: string) {
    return this._db.dbStripeWebhookEvent.findUnique({
      where: { stripeEventId },
    });
  }

  public async findBarById(barId: BarId) {
    return this._db.dbBar.findUnique({
      where: { id: barId },
    });
  }
}
