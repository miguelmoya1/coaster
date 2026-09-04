import { ErrorCodes, SubscriptionPlan } from '@coaster/common';
import { DbSubscriptionPlan, DbSubscriptionStatus } from '@coaster/core/db';
import { InternalServerErrorException } from '@nestjs/common';
import Stripe from 'stripe';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  createIntegrationIdentifier,
  describeStripeError,
  getExtraSeatPriceCents,
  getIncludedSeats,
  getPriceId,
  toDbPlan,
  toDbStatus,
  toSubscriptionSnapshot,
} from './stripe.utils';

describe('stripe.utils', () => {
  let configServiceMock: any;

  beforeEach(() => {
    configServiceMock = {
      get: vi.fn().mockImplementation((key: string) => {
        if (key === 'STRIPE_PRICE_PRO') return 'price_pro_123';
        return undefined;
      }),
    };
  });

  describe('getPriceId', () => {
    it('should return price ID for PRO', () => {
      expect(getPriceId(SubscriptionPlan.PRO, configServiceMock)).toBe('price_pro_123');
    });

    it('should throw InternalServerErrorException if price is not configured', () => {
      configServiceMock.get.mockReturnValue(undefined);
      expect(() => getPriceId(SubscriptionPlan.PRO, configServiceMock)).toThrow(InternalServerErrorException);
    });

    it('should reject plans outside the supported catalog with an application error code', () => {
      expect(() => getPriceId('YEARLY' as Exclude<SubscriptionPlan, 'FREE'>, configServiceMock)).toThrow(
        ErrorCodes.INVALID_SUBSCRIPTION_PLAN,
      );
    });
  });

  describe('toDbPlan', () => {
    it('should return PRO when price matches pro price', () => {
      expect(toDbPlan('price_pro_123', configServiceMock)).toBe(DbSubscriptionPlan.PRO);
    });

    it('should return FREE when price does not match any configured plan', () => {
      expect(toDbPlan('unknown_price', configServiceMock)).toBe(DbSubscriptionPlan.FREE);
      expect(toDbPlan(undefined, configServiceMock)).toBe(DbSubscriptionPlan.FREE);
    });

    it('should keep subscribers on a price sold before the current one', () => {
      configServiceMock.get.mockImplementation((key: string) => {
        if (key === 'STRIPE_PRICE_PRO') return 'price_pro_tax_excluded';
        if (key === 'STRIPE_PRICE_PRO_LEGACY') return 'price_pro_123, price_pro_older';
        return undefined;
      });

      expect(toDbPlan('price_pro_tax_excluded', configServiceMock)).toBe(DbSubscriptionPlan.PRO);
      expect(toDbPlan('price_pro_123', configServiceMock)).toBe(DbSubscriptionPlan.PRO);
      expect(toDbPlan('price_pro_older', configServiceMock)).toBe(DbSubscriptionPlan.PRO);
      expect(toDbPlan('price_of_another_product', configServiceMock)).toBe(DbSubscriptionPlan.FREE);
    });

    it('should not turn an empty legacy list into a price that matches everything', () => {
      configServiceMock.get.mockImplementation((key: string) => {
        if (key === 'STRIPE_PRICE_PRO') return 'price_pro_123';
        if (key === 'STRIPE_PRICE_PRO_LEGACY') return '  ,  ';
        return undefined;
      });

      expect(toDbPlan('', configServiceMock)).toBe(DbSubscriptionPlan.FREE);
      expect(toDbPlan('price_pro_123', configServiceMock)).toBe(DbSubscriptionPlan.PRO);
    });
  });

  describe('describeStripeError', () => {
    it('should carry what Stripe actually complained about', () => {
      const described = describeStripeError({
        type: 'invalid_request_error',
        code: 'parameter_invalid_empty',
        param: 'line_items[0][price]',
        message: 'No such price',
      });

      expect(described).toContain('invalid_request_error');
      expect(described).toContain('param=line_items[0][price]');
      expect(described).toContain('No such price');
    });

    it('should say something for a throw that is not a Stripe error', () => {
      expect(describeStripeError(new Error('socket hang up'))).toContain('socket hang up');
      expect(describeStripeError('boom')).toBe('boom');
      expect(describeStripeError({})).toBe('no details');
    });
  });

  describe('createIntegrationIdentifier', () => {
    it('should derive the same identifier from the same seed, so a retried request keeps its payload', () => {
      expect(createIntegrationIdentifier('checkout:establishment-1:PRO:42')).toBe(
        createIntegrationIdentifier('checkout:establishment-1:PRO:42'),
      );
    });

    it('should tell different seeds apart', () => {
      expect(createIntegrationIdentifier('checkout:establishment-1:PRO:42')).not.toBe(
        createIntegrationIdentifier('checkout:establishment-1:PRO:43'),
      );
    });

    it('should stay random when no seed is given', () => {
      expect(createIntegrationIdentifier()).not.toBe(createIntegrationIdentifier());
    });

    it('should keep the coaster_subscription_ shape', () => {
      expect(createIntegrationIdentifier('seed')).toMatch(/^coaster_subscription_[a-z]{8}$/);
      expect(createIntegrationIdentifier()).toMatch(/^coaster_subscription_[a-z]{8}$/);
    });
  });

  describe('seat allowance', () => {
    const withEnv = (env: Record<string, string | undefined>) => ({
      get: vi.fn().mockImplementation((key: string) => env[key]),
    });

    it('should fall back to ten included seats at two euros each when nothing is configured', () => {
      const config = withEnv({}) as any;

      expect(getIncludedSeats(config)).toBe(10);
      expect(getExtraSeatPriceCents(config)).toBe(200);
    });

    it('should read the configured values, which arrive from the environment as strings', () => {
      const config = withEnv({ PRO_INCLUDED_SEATS: '5', PRO_EXTRA_SEAT_PRICE_CENTS: '300' }) as any;

      expect(getIncludedSeats(config)).toBe(5);
      expect(getExtraSeatPriceCents(config)).toBe(300);
    });

    it('should ignore a value that is not a positive whole number rather than bill from it', () => {
      const config = withEnv({ PRO_INCLUDED_SEATS: '', PRO_EXTRA_SEAT_PRICE_CENTS: 'gratis' }) as any;

      expect(getIncludedSeats(config)).toBe(10);
      expect(getExtraSeatPriceCents(config)).toBe(200);
    });
  });

  describe('toSubscriptionSnapshot', () => {
    const subscriptionWith = (item: Record<string, unknown>) =>
      ({
        id: 'sub_1',
        status: 'active',
        items: { data: [item] },
      }) as unknown as Stripe.Subscription;

    it('should carry the item quantity across as the seats being billed', () => {
      const snapshot = toSubscriptionSnapshot(
        subscriptionWith({ quantity: 12, price: { id: 'price_pro_123' } }),
        configServiceMock,
      );

      expect(snapshot.seats).toBe(12);
    });

    it('should read a subscription without a quantity as one seat', () => {
      const snapshot = toSubscriptionSnapshot(
        subscriptionWith({ price: { id: 'price_pro_123' } }),
        configServiceMock,
      );

      expect(snapshot.seats).toBe(1);
    });
  });

  describe('toDbStatus', () => {
    it('should map stripe status to DbSubscriptionStatus', () => {
      expect(toDbStatus('trialing')).toBe(DbSubscriptionStatus.TRIALING);
      expect(toDbStatus('active')).toBe(DbSubscriptionStatus.ACTIVE);
      expect(toDbStatus('past_due')).toBe(DbSubscriptionStatus.PAST_DUE);
      expect(toDbStatus('canceled')).toBe(DbSubscriptionStatus.CANCELED);
      expect(toDbStatus('unpaid')).toBe(DbSubscriptionStatus.UNPAID);
      expect(toDbStatus('incomplete' as Stripe.Subscription.Status)).toBe(DbSubscriptionStatus.INACTIVE);
    });
  });
});
