import { SubscriptionPlan } from '@coaster/common';
import { InternalServerErrorException } from '@nestjs/common';
import Stripe from 'stripe';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DbSubscriptionPlan, DbSubscriptionStatus } from '../../core/db';
import { getPriceId, toDbPlan, toDbStatus } from './stripe.utils';

describe('stripe.utils', () => {
  let configServiceMock: any;

  beforeEach(() => {
    configServiceMock = {
      get: vi.fn().mockImplementation((key: string) => {
        if (key === 'STRIPE_PRICE_PRO_MONTHLY') return 'price_monthly_123';
        if (key === 'STRIPE_PRICE_PRO_YEARLY') return 'price_yearly_456';
        return undefined;
      }),
    };
  });

  describe('getPriceId', () => {
    it('should return price ID for PRO_MONTHLY', () => {
      expect(getPriceId(SubscriptionPlan.PRO_MONTHLY, configServiceMock)).toBe('price_monthly_123');
    });

    it('should return price ID for PRO_YEARLY', () => {
      expect(getPriceId(SubscriptionPlan.PRO_YEARLY, configServiceMock)).toBe('price_yearly_456');
    });

    it('should throw InternalServerErrorException if price is not configured', () => {
      configServiceMock.get.mockReturnValue(undefined);
      expect(() => getPriceId(SubscriptionPlan.PRO_MONTHLY, configServiceMock)).toThrow(InternalServerErrorException);
    });
  });

  describe('toDbPlan', () => {
    it('should return PRO_MONTHLY when price matches monthly price', () => {
      expect(toDbPlan('price_monthly_123', configServiceMock)).toBe(DbSubscriptionPlan.PRO_MONTHLY);
    });

    it('should return PRO_YEARLY when price matches yearly price', () => {
      expect(toDbPlan('price_yearly_456', configServiceMock)).toBe(DbSubscriptionPlan.PRO_YEARLY);
    });

    it('should return FREE when price does not match any configured plan', () => {
      expect(toDbPlan('unknown_price', configServiceMock)).toBe(DbSubscriptionPlan.FREE);
      expect(toDbPlan(undefined, configServiceMock)).toBe(DbSubscriptionPlan.FREE);
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
