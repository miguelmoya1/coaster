import { ErrorCodes, SubscriptionPlan } from '@coaster/common';
import { BadRequestException, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomBytes } from 'crypto';
import Stripe from 'stripe';
import { DbSubscriptionPlan, DbSubscriptionStatus } from '../../core/db';

export function getPriceId(plan: Exclude<SubscriptionPlan, 'FREE'>, configService: ConfigService): string {
  if (plan !== SubscriptionPlan.PRO) {
    throw new BadRequestException(ErrorCodes.INVALID_SUBSCRIPTION_PLAN);
  }

  const priceId = configService.get<string>('STRIPE_PRICE_PRO');

  if (!priceId) {
    throw new InternalServerErrorException(ErrorCodes.STRIPE_PRICE_NOT_CONFIGURED);
  }

  return priceId;
}

export function isStripeResourceMissingError(error: unknown, resource: 'customer' | 'subscription'): boolean {
  if (!error || typeof error !== 'object') {
    return false;
  }

  const candidate = error as { code?: unknown; param?: unknown; message?: unknown };
  const code = candidate.code;
  const param = typeof candidate.param === 'string' ? candidate.param.toLowerCase() : '';
  const message = typeof candidate.message === 'string' ? candidate.message.toLowerCase() : '';
  const resourceName = resource.toLowerCase();

  return code === 'resource_missing' && (param.includes(resourceName) || message.includes(`no such ${resourceName}`));
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
    case 'incomplete_expired':
      return DbSubscriptionStatus.EXPIRED;
    default:
      return DbSubscriptionStatus.INACTIVE;
  }
}

export function createIntegrationIdentifier(): string {
  const alphabet = 'abcdefghijklmnopqrstuvwxyz';
  const bytes = randomBytes(8);
  const suffix = Array.from(bytes, (byte) => alphabet[byte % alphabet.length]).join('');
  return `coaster_subscription_${suffix}`;
}
