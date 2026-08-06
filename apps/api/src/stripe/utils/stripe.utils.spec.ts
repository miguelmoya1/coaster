import { ErrorCodes, SubscriptionPlan } from '@coaster/common';
import { DbSubscriptionPlan, DbSubscriptionStatus } from '@coaster/core/db';
import { InternalServerErrorException } from '@nestjs/common';
import Stripe from 'stripe';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createIntegrationIdentifier, getPriceId, toDbPlan, toDbStatus } from './stripe.utils';

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
  });

  describe('createIntegrationIdentifier', () => {
    it('should derive the same identifier from the same seed, so a retried request keeps its payload', () => {
      expect(createIntegrationIdentifier('checkout:bar-1:PRO:42')).toBe(
        createIntegrationIdentifier('checkout:bar-1:PRO:42'),
      );
    });

    it('should tell different seeds apart', () => {
      expect(createIntegrationIdentifier('checkout:bar-1:PRO:42')).not.toBe(
        createIntegrationIdentifier('checkout:bar-1:PRO:43'),
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
