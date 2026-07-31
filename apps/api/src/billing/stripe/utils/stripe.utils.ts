import { SubscriptionPlan } from '@coaster/common';
import { InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';
import { DbSubscriptionPlan, DbSubscriptionStatus } from '../../../core/db';

export function getPriceId(plan: Exclude<SubscriptionPlan, 'FREE'>, configService: ConfigService): string {
  const monthly = configService.get<string>('STRIPE_PRICE_PRO_MONTHLY');
  const yearly = configService.get<string>('STRIPE_PRICE_PRO_YEARLY');

  const prices = {
    [SubscriptionPlan.PRO_MONTHLY]: monthly,
    [SubscriptionPlan.PRO_YEARLY]: yearly,
  };

  const priceId = prices[plan];

  if (!priceId) {
    throw new InternalServerErrorException(`Missing Stripe price for plan ${plan}`);
  }

  return priceId;
}

export function toDbPlan(priceId: string | undefined, configService: ConfigService): DbSubscriptionPlan {
  const monthly = configService.get<string>('STRIPE_PRICE_PRO_MONTHLY');
  const yearly = configService.get<string>('STRIPE_PRICE_PRO_YEARLY');

  if (priceId && monthly && priceId === monthly) {
    return DbSubscriptionPlan.PRO_MONTHLY;
  }

  if (priceId && yearly && priceId === yearly) {
    return DbSubscriptionPlan.PRO_YEARLY;
  }

  return DbSubscriptionPlan.FREE;
}

export function toDbStatus(status: Stripe.Subscription.Status): DbSubscriptionStatus {
  switch (status) {
    case 'trialing':
      return DbSubscriptionStatus.TRIALING;
    case 'active':
      return DbSubscriptionStatus.ACTIVE;
    case 'past_due':
      return DbSubscriptionStatus.PAST_DUE;
    case 'canceled':
      return DbSubscriptionStatus.CANCELED;
    case 'unpaid':
      return DbSubscriptionStatus.UNPAID;
    default:
      return DbSubscriptionStatus.INACTIVE;
  }
}
