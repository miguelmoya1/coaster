import { SubscriptionPlan } from '@coaster/common';
import { InternalServerErrorException } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DbSubscriptionPlan, DbSubscriptionStatus } from '../../../core/db';
import { getPriceId, toDbPlan, toDbStatus } from './stripe.utils';

describe('stripe.utils', () => {
  let configServiceMock: any;

  beforeEach(() => {
    configServiceMock = {
      get: vi.fn(),
    };
  });

  describe('getPriceId', () => {
    it('should return correct price id for PRO_MONTHLY', () => {
      configServiceMock.get.mockImplementation((key: string) => {
        if (key === 'STRIPE_PRICE_PRO_MONTHLY') return 'price_monthly';
        if (key === 'STRIPE_PRICE_PRO_YEARLY') return 'price_yearly';
        return undefined;
      });

      expect(getPriceId(SubscriptionPlan.PRO_MONTHLY, configServiceMock)).toBe('price_monthly');
    });

    it('should throw InternalServerErrorException if price id is not configured', () => {
      configServiceMock.get.mockReturnValue(undefined);

      expect(() => getPriceId(SubscriptionPlan.PRO_MONTHLY, configServiceMock)).toThrow(InternalServerErrorException);
    });
  });

  describe('toDbPlan', () => {
    it('should return PRO_MONTHLY if priceId matches PRO_MONTHLY', () => {
      configServiceMock.get.mockImplementation((key: string) => {
        if (key === 'STRIPE_PRICE_PRO_MONTHLY') return 'price_monthly';
        if (key === 'STRIPE_PRICE_PRO_YEARLY') return 'price_yearly';
        return undefined;
      });

      expect(toDbPlan('price_monthly', configServiceMock)).toBe(DbSubscriptionPlan.PRO_MONTHLY);
    });

    it('should return PRO_YEARLY if priceId matches PRO_YEARLY', () => {
      configServiceMock.get.mockImplementation((key: string) => {
        if (key === 'STRIPE_PRICE_PRO_MONTHLY') return 'price_monthly';
        if (key === 'STRIPE_PRICE_PRO_YEARLY') return 'price_yearly';
        return undefined;
      });

      expect(toDbPlan('price_yearly', configServiceMock)).toBe(DbSubscriptionPlan.PRO_YEARLY);
    });

    it('should return FREE for unknown priceId', () => {
      configServiceMock.get.mockReturnValue(undefined);

      expect(toDbPlan('unknown', configServiceMock)).toBe(DbSubscriptionPlan.FREE);
    });
  });

  describe('toDbStatus', () => {
    it('should map Stripe status correctly', () => {
      expect(toDbStatus('trialing')).toBe(DbSubscriptionStatus.TRIALING);
      expect(toDbStatus('active')).toBe(DbSubscriptionStatus.ACTIVE);
      expect(toDbStatus('past_due')).toBe(DbSubscriptionStatus.PAST_DUE);
      expect(toDbStatus('canceled')).toBe(DbSubscriptionStatus.CANCELED);
      expect(toDbStatus('unpaid')).toBe(DbSubscriptionStatus.UNPAID);
      expect(toDbStatus('incomplete' as any)).toBe(DbSubscriptionStatus.INACTIVE);
    });
  });
});
