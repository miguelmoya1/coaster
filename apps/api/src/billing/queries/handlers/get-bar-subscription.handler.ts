import { BarSubscription, SubscriptionPlan, SubscriptionStatus } from '@coaster/common';
import { Injectable } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { BillingReadRepository } from '../../data-access/billing.read.repository';
import { GetBarSubscriptionQuery } from '../impl/get-bar-subscription.query';

@Injectable()
@QueryHandler(GetBarSubscriptionQuery)
export class GetBarSubscriptionHandler implements IQueryHandler<GetBarSubscriptionQuery, BarSubscription> {
  constructor(private readonly _readRepo: BillingReadRepository) {}

  async execute(query: GetBarSubscriptionQuery): Promise<BarSubscription> {
    const { barId } = query;
    const subscription = await this._readRepo.findSubscriptionByBarId(barId);

    if (!subscription) {
      return {
        barId,
        plan: SubscriptionPlan.FREE,
        status: SubscriptionStatus.INACTIVE,
        cancelAtPeriodEnd: false,
      };
    }

    return {
      barId,
      plan: subscription.plan,
      status: subscription.status,
      cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
      currentPeriodStart: subscription.currentPeriodStart?.toISOString(),
      currentPeriodEnd: subscription.currentPeriodEnd?.toISOString(),
      canceledAt: subscription.canceledAt?.toISOString(),
      stripeCustomerId: subscription.stripeCustomerId ?? undefined,
      stripeSubscriptionId: subscription.stripeSubscriptionId ?? undefined,
    };
  }
}
