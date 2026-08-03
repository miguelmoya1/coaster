import type { BarId } from '@coaster/common';
import { Injectable, Logger } from '@nestjs/common';
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
  private readonly _logger = new Logger(BillingWriteRepository.name);

  constructor(private readonly _db: DbService) {}

  public async upsertBarCustomerId(barId: BarId, stripeCustomerId: string, stripeSubscriptionId?: string | null) {
    this._logger.debug(
      `upsertBarCustomerId: barId=${barId}, stripeCustomerId=${stripeCustomerId}, stripeSubscriptionId=${stripeSubscriptionId}`,
    );
    return this._db.dbBarSubscription.upsert({
      where: { barId },
      create: {
        barId,
        stripeCustomerId,
        stripeSubscriptionId,
        status: DbSubscriptionStatus.ACTIVE,
      },
      update: {
        stripeCustomerId,
        status: DbSubscriptionStatus.ACTIVE,
        ...(stripeSubscriptionId !== undefined ? { stripeSubscriptionId } : {}),
      },
    });
  }

  public async upsertSubscriptionDetails(barId: BarId, data: UpsertSubscriptionData) {
    this._logger.debug(`upsertSubscriptionDetails: barId=${barId}, plan=${data.plan}, status=${data.status}`);
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

    this._logger.debug(
      `updateManySubscriptionsStatusToPastDue: subscriptionId=${subscriptionId}, customerId=${customerId}`,
    );
    const where = subscriptionId ? { stripeSubscriptionId: subscriptionId } : { stripeCustomerId: customerId! };

    return this._db.dbBarSubscription.updateMany({
      where,
      data: { status: DbSubscriptionStatus.PAST_DUE },
    });
  }

  public async recordStripeWebhookEvent(stripeEventId: string, type: string, payload: any) {
    this._logger.debug(`recordStripeWebhookEvent: stripeEventId=${stripeEventId}, type=${type}`);
    return this._db.dbStripeWebhookEvent.create({
      data: {
        stripeEventId,
        type,
        payload: JSON.parse(JSON.stringify(payload)),
      },
    });
  }
}
