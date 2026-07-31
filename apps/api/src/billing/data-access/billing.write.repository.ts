import type { BarId } from '@coaster/common';
import { Injectable } from '@nestjs/common';
import { DbService, DbSubscriptionPlan, DbSubscriptionStatus } from '../../core/db';

export interface UpsertSubscriptionData {
  stripeCustomerId: string;
  stripeSubscriptionId: string;
  plan: DbSubscriptionPlan;
  status: DbSubscriptionStatus;
  currentPeriodStart: Date | null;
  currentPeriodEnd: Date | null;
  cancelAtPeriodEnd: boolean;
  canceledAt: Date | null;
}

@Injectable()
export class BillingWriteRepository {
  constructor(private readonly _db: DbService) {}

  public async upsertBarCustomerId(barId: BarId, stripeCustomerId: string, stripeSubscriptionId?: string | null) {
    return this._db.dbBarSubscription.upsert({
      where: { barId },
      create: {
        barId,
        stripeCustomerId,
        stripeSubscriptionId,
      },
      update: {
        stripeCustomerId,
        ...(stripeSubscriptionId !== undefined ? { stripeSubscriptionId } : {}),
      },
    });
  }

  public async upsertSubscriptionDetails(barId: BarId, data: UpsertSubscriptionData) {
    return this._db.dbBarSubscription.upsert({
      where: { barId },
      create: {
        barId,
        ...data,
      },
      update: data,
    });
  }

  public async updateManySubscriptionsStatusToPastDue(subscriptionId?: string | null, customerId?: string | null) {
    if (!subscriptionId && !customerId) {
      return { count: 0 };
    }

    const where = subscriptionId ? { stripeSubscriptionId: subscriptionId } : { stripeCustomerId: customerId! };

    return this._db.dbBarSubscription.updateMany({
      where,
      data: { status: DbSubscriptionStatus.PAST_DUE },
    });
  }

  public async recordStripeWebhookEvent(stripeEventId: string, type: string, payload: any) {
    return this._db.dbStripeWebhookEvent.create({
      data: {
        stripeEventId,
        type,
        payload: JSON.parse(JSON.stringify(payload)),
      },
    });
  }
}
