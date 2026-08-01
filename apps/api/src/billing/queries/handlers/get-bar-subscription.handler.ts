import { BarSubscription, SubscriptionPlan, SubscriptionStatus } from '@coaster/common';
import { Injectable, Logger } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { BillingReadRepository } from '../../data-access/billing.read.repository';
import { GetBarSubscriptionQuery } from '../impl/get-bar-subscription.query';

@Injectable()
@QueryHandler(GetBarSubscriptionQuery)
export class GetBarSubscriptionHandler implements IQueryHandler<GetBarSubscriptionQuery, BarSubscription> {
  private readonly _logger = new Logger(GetBarSubscriptionHandler.name);

  constructor(private readonly _readRepo: BillingReadRepository) {}

  async execute(query: GetBarSubscriptionQuery): Promise<BarSubscription> {
    const { barId } = query;
    this._logger.debug(`Executing GetBarSubscriptionQuery for barId=${barId}`);
    const subscription = await this._readRepo.findSubscriptionByBarId(barId);

    if (!subscription) {
      this._logger.debug(`No active subscription found in DB for barId=${barId}, returning default FREE plan`);
      return {
        barId,
        plan: SubscriptionPlan.FREE,
        status: SubscriptionStatus.INACTIVE,
        cancelAtPeriodEnd: false,
      };
    }

    this._logger.debug(`Subscription found for barId=${barId}: plan=${subscription.plan}, status=${subscription.status}`);
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
