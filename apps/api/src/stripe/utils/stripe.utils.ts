import { SubscriptionPlan } from '@coaster/common';
import { InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';
import { DbSubscriptionPlan, DbSubscriptionStatus } from '../../core/db';

export function getPriceId(plan: Exclude<SubscriptionPlan, 'FREE'>, configService: ConfigService): string {
  const priceId = configService.get<string>('STRIPE_PRICE_PRO');

  if (!priceId) {
    throw new InternalServerErrorException(`Missing Stripe price for plan ${plan}`);
  }

  return priceId;
}

export function toDbPlan(priceId: string | undefined, configService: ConfigService): DbSubscriptionPlan {
  const proPrice = configService.get<string>('STRIPE_PRICE_PRO');

  if (priceId && proPrice && priceId === proPrice) {
    return DbSubscriptionPlan.PRO;
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
