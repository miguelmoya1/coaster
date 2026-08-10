import { ErrorCodes, SubscriptionPlan } from '@coaster/common';
import { DbSubscriptionPlan, DbSubscriptionStatus } from '@coaster/core/db';
import { BadRequestException, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash, randomBytes } from 'crypto';
import type { Subscription } from 'stripe';

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

/**
 * Whether a Stripe subscription is still worth anything: it either grants access or is expected to
 * once payment clears. Anything else is spent, so it can be safely replaced by a fresh purchase.
 */
export function isLiveSubscription(status: Subscription.Status): boolean {
  return status !== 'canceled' && status !== 'incomplete_expired';
}

export function toDbPlan(priceId: string | undefined, configService: ConfigService): DbSubscriptionPlan {
  const proPrice = configService.get<string>('STRIPE_PRICE_PRO');

  if (priceId && proPrice && priceId === proPrice) {
    return DbSubscriptionPlan.PRO;
  }

  return DbSubscriptionPlan.FREE;
}

export function toDbStatus(status: Subscription.Status): DbSubscriptionStatus {
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

export interface StripeSubscriptionSnapshot {
  plan: DbSubscriptionPlan;
  status: DbSubscriptionStatus;
  stripeSubscriptionId: string | null;
  currentPeriodStart: Date | null;
  currentPeriodEnd: Date | null;
  trialEndsAt: Date | null;
  canceledAt: Date | null;
  /** Not a column: the caller decides which domain event the change deserves. */
  isCancellation: boolean;
}

/**
 * The single reading of what a Stripe subscription means for an establishment. Both the checkout webhook and
 * the subscription webhook write the same row, so they have to agree on this or whichever arrives
 * last quietly overwrites the other with a different opinion.
 */
export function toSubscriptionSnapshot(
  subscription: Subscription,
  configService: ConfigService,
): StripeSubscriptionSnapshot {
  // A subscription without items should not be possible, but a webhook is a bad place to find out.
  const firstItem = subscription.items?.data?.[0];
  const isTerminalCancellation = subscription.status === 'canceled';
  const isScheduledCancellation = Boolean(subscription.cancel_at_period_end || subscription.cancel_at);

  return {
    plan: isTerminalCancellation ? DbSubscriptionPlan.FREE : toDbPlan(firstItem?.price?.id, configService),
    status:
      isTerminalCancellation || isScheduledCancellation
        ? DbSubscriptionStatus.CANCELED
        : toDbStatus(subscription.status),
    stripeSubscriptionId: isTerminalCancellation ? null : subscription.id,
    currentPeriodStart: firstItem?.current_period_start ? new Date(firstItem.current_period_start * 1000) : null,
    currentPeriodEnd: subscription.cancel_at
      ? new Date(subscription.cancel_at * 1000)
      : firstItem?.current_period_end
        ? new Date(firstItem.current_period_end * 1000)
        : null,
    trialEndsAt: subscription.trial_end ? new Date(subscription.trial_end * 1000) : null,
    canceledAt: subscription.canceled_at ? new Date(subscription.canceled_at * 1000) : null,
    isCancellation: isTerminalCancellation || isScheduledCancellation,
  };
}

export function createIntegrationIdentifier(seed?: string): string {
  const alphabet = 'abcdefghijklmnopqrstuvwxyz';
  const bytes = seed ? createHash('sha256').update(seed).digest().subarray(0, 8) : randomBytes(8);
  const suffix = Array.from(bytes, (byte) => alphabet[byte % alphabet.length]).join('');
  return `coaster_subscription_${suffix}`;
}
