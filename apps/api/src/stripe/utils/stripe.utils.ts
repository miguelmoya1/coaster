import { ErrorCodes, SubscriptionPlan } from '@coaster/common';
import { DbSubscriptionPlan, DbSubscriptionStatus } from '@coaster/core/db';
import { BadRequestException, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash, randomBytes } from 'crypto';
import type { Subscription } from 'stripe';

const DEFAULT_INCLUDED_SEATS = 10;
const DEFAULT_EXTRA_SEAT_PRICE_CENTS = 200;

function readPositiveInt(value: string | undefined, fallback: number): number {
  const parsed = Number(value);

  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : fallback;
}

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

export function describeStripeError(error: unknown): string {
  if (!error || typeof error !== 'object') {
    return String(error);
  }

  const candidate = error as { type?: string; code?: string; param?: string; message?: string };

  return (
    [candidate.type, candidate.code, candidate.param && `param=${candidate.param}`, candidate.message]
      .filter(Boolean)
      .join(' · ') || 'no details'
  );
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

export function isLiveSubscription(status: Subscription.Status): boolean {
  return status !== 'canceled' && status !== 'incomplete_expired';
}

export function getProPriceIds(configService: ConfigService): string[] {
  return [configService.get<string>('STRIPE_PRICE_PRO'), configService.get<string>('STRIPE_PRICE_PRO_LEGACY')]
    .flatMap((value) => (value ?? '').split(','))
    .map((value) => value.trim())
    .filter(Boolean);
}

export function getIncludedSeats(configService: ConfigService): number {
  return readPositiveInt(configService.get<string>('PRO_INCLUDED_SEATS'), DEFAULT_INCLUDED_SEATS);
}

export function getExtraSeatPriceCents(configService: ConfigService): number {
  return readPositiveInt(configService.get<string>('PRO_EXTRA_SEAT_PRICE_CENTS'), DEFAULT_EXTRA_SEAT_PRICE_CENTS);
}

export function toDbPlan(priceId: string | undefined, configService: ConfigService): DbSubscriptionPlan {
  if (priceId && getProPriceIds(configService).includes(priceId)) {
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
  seats: number;
  stripeSubscriptionId: string | null;
  currentPeriodStart: Date | null;
  currentPeriodEnd: Date | null;
  trialEndsAt: Date | null;
  canceledAt: Date | null;
  isCancellation: boolean;
}

export function toSubscriptionSnapshot(
  subscription: Subscription,
  configService: ConfigService,
): StripeSubscriptionSnapshot {
  const firstItem = subscription.items?.data?.[0];
  const isTerminalCancellation = subscription.status === 'canceled';
  const isScheduledCancellation = Boolean(subscription.cancel_at_period_end || subscription.cancel_at);

  return {
    plan: isTerminalCancellation ? DbSubscriptionPlan.FREE : toDbPlan(firstItem?.price?.id, configService),
    seats: firstItem?.quantity ?? 1,
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
