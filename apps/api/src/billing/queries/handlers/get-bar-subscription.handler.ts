import { BarSubscription, SubscriptionPlan, SubscriptionStatus } from '@coaster/common';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { StripeClient, toDbPlan, toDbStatus } from '../../../stripe';
import { BillingReadRepository } from '../../data-access/billing.read.repository';
import { BillingWriteRepository } from '../../data-access/billing.write.repository';
import { GetBarSubscriptionQuery } from '../impl/get-bar-subscription.query';

@Injectable()
@QueryHandler(GetBarSubscriptionQuery)
export class GetBarSubscriptionHandler implements IQueryHandler<GetBarSubscriptionQuery, BarSubscription> {
  private readonly _logger = new Logger(GetBarSubscriptionHandler.name);

  constructor(
    private readonly _readRepo: BillingReadRepository,
    private readonly _writeRepo: BillingWriteRepository,
    private readonly _stripeClient: StripeClient,
    private readonly _configService: ConfigService,
  ) {}

  async execute(query: GetBarSubscriptionQuery): Promise<BarSubscription> {
    const { barId } = query;
    this._logger.debug(`Executing GetBarSubscriptionQuery for barId=${barId}`);
    let subscription = await this._readRepo.findSubscriptionByBarId(barId);

    if (subscription?.stripeSubscriptionId) {
      try {
        const stripeSub = await this._stripeClient.client.subscriptions.retrieve(subscription.stripeSubscriptionId);
        const subAny = stripeSub as any;
        const firstItem = stripeSub.items.data[0];
        const currentPeriodStart = subAny.current_period_start
          ? new Date(subAny.current_period_start * 1000)
          : firstItem?.current_period_start
            ? new Date(firstItem.current_period_start * 1000)
            : null;
        const currentPeriodEnd = (subAny.cancel_at || subAny.current_period_end)
          ? new Date((subAny.cancel_at || subAny.current_period_end) * 1000)
          : firstItem?.current_period_end
            ? new Date(firstItem.current_period_end * 1000)
            : null;
        const plan = toDbPlan(firstItem?.price?.id, this._configService);
        const status = toDbStatus(stripeSub.status);
        const customerId = typeof stripeSub.customer === 'string' ? stripeSub.customer : stripeSub.customer.id;

        await this._writeRepo.upsertSubscriptionDetails(barId, {
          stripeCustomerId: customerId,
          stripeSubscriptionId: stripeSub.id,
          plan,
          status,
          currentPeriodStart,
          currentPeriodEnd,
          cancelAtPeriodEnd: stripeSub.cancel_at_period_end,
          canceledAt: stripeSub.canceled_at ? new Date(stripeSub.canceled_at * 1000) : null,
        });

        subscription = await this._readRepo.findSubscriptionByBarId(barId);
      } catch (err) {
        this._logger.warn(`Failed to sync subscription status directly from Stripe for barId=${barId}: ${err}`);
      }
    }

    if (!subscription) {
      this._logger.debug(`No active subscription found in DB for barId=${barId}, returning default FREE plan`);
      return {
        barId,
        plan: SubscriptionPlan.FREE,
        status: SubscriptionStatus.INACTIVE,
        cancelAtPeriodEnd: false,
      };
    }

    let status: SubscriptionStatus = subscription.status as SubscriptionStatus;
    const now = new Date();

    if (status === SubscriptionStatus.TRIALING && subscription.trialEndsAt && now > subscription.trialEndsAt) {
      status = SubscriptionStatus.EXPIRED;
    }

    this._logger.debug(
      `Subscription found for barId=${barId}: plan=${subscription.plan}, status=${status}, cancelAtPeriodEnd=${subscription.cancelAtPeriodEnd}`,
    );
    return {
      barId,
      plan: subscription.plan as SubscriptionPlan,
      status,
      cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
      trialEndsAt: subscription.trialEndsAt?.toISOString(),
      currentPeriodStart: subscription.currentPeriodStart?.toISOString(),
      currentPeriodEnd: subscription.currentPeriodEnd?.toISOString(),
      canceledAt: subscription.canceledAt?.toISOString(),
      stripeCustomerId: subscription.stripeCustomerId ?? undefined,
      stripeSubscriptionId: subscription.stripeSubscriptionId ?? undefined,
    };
  }
}
