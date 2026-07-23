import { BarId, SubscriptionPlan, SubscriptionStatus } from '@coaster/common';
import { BadRequestException, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EventBus } from '@nestjs/cqrs';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DbSubscriptionPlan, DbSubscriptionStatus } from '../../core/db';
import { BillingService } from './billing.service';

describe('BillingService', () => {
  let service: BillingService;
  let dbMock: any;
  let configServiceMock: any;
  let eventBusMock: any;
  let stripeMock: any;

  const mockBarId = 'bar-123' as BarId;
  const mockCustomerId = 'cus_123';
  const mockSubscriptionId = 'sub_123';
  const mockPriceMonthly = 'price_monthly_123';
  const mockPriceYearly = 'price_yearly_123';
  const mockWebhookSecret = 'whsec_test123';

  beforeEach(() => {
    vi.clearAllMocks();

    dbMock = {
      dbBarSubscription: {
        findUnique: vi.fn(),
        findFirst: vi.fn(),
        findMany: vi.fn(),
        upsert: vi.fn(),
        updateMany: vi.fn(),
      },
      dbBar: {
        findUnique: vi.fn(),
      },
      dbStripeWebhookEvent: {
        findUnique: vi.fn(),
        create: vi.fn(),
      },
    };

    configServiceMock = {
      get: vi.fn((key: string) => {
        switch (key) {
          case 'STRIPE_SECRET_KEY':
            return 'sk_test_123';
          case 'STRIPE_WEBHOOK_SECRET':
            return mockWebhookSecret;
          case 'STRIPE_PRICE_PRO_MONTHLY':
            return mockPriceMonthly;
          case 'STRIPE_PRICE_PRO_YEARLY':
            return mockPriceYearly;
          default:
            return undefined;
        }
      }),
    };

    eventBusMock = {
      publish: vi.fn(),
    };

    stripeMock = {
      customers: {
        create: vi.fn().mockResolvedValue({ id: mockCustomerId }),
        update: vi.fn().mockResolvedValue({ id: mockCustomerId }),
      },
      checkout: {
        sessions: {
          create: vi.fn().mockResolvedValue({ id: 'cs_123', url: 'https://checkout.stripe.com/pay' }),
        },
      },
      billingPortal: {
        sessions: {
          create: vi.fn().mockResolvedValue({ url: 'https://billing.stripe.com/session' }),
        },
      },
      webhooks: {
        constructEvent: vi.fn(),
      },
    };

    service = new BillingService(dbMock, configServiceMock, eventBusMock);
    (service as any)._stripe = stripeMock;
  });

  describe('createCheckoutSession', () => {
    it('should create customer if not existing and create checkout session', async () => {
      dbMock.dbBarSubscription.findUnique.mockResolvedValue(null);
      dbMock.dbBar.findUnique.mockResolvedValue({ name: 'My Bar' });

      const result = await service.createCheckoutSession(
        mockBarId,
        SubscriptionPlan.PRO_MONTHLY,
        'https://app.com/success',
        'https://app.com/cancel',
      );

      expect(stripeMock.customers.create).toHaveBeenCalledWith({
        metadata: { barId: mockBarId },
        name: 'My Bar',
      });
      expect(dbMock.dbBarSubscription.upsert).toHaveBeenCalledWith({
        where: { barId: mockBarId },
        create: { barId: mockBarId, stripeCustomerId: mockCustomerId },
        update: { stripeCustomerId: mockCustomerId },
      });
      expect(stripeMock.checkout.sessions.create).toHaveBeenCalledWith({
        mode: 'subscription',
        customer: mockCustomerId,
        success_url: 'https://app.com/success',
        cancel_url: 'https://app.com/cancel',
        client_reference_id: mockBarId,
        allow_promotion_codes: true,
        line_items: [{ price: mockPriceMonthly, quantity: 1 }],
        metadata: { barId: mockBarId, plan: SubscriptionPlan.PRO_MONTHLY },
        subscription_data: {
          metadata: { barId: mockBarId, plan: SubscriptionPlan.PRO_MONTHLY },
        },
      });
      expect(result).toEqual({ id: 'cs_123', url: 'https://checkout.stripe.com/pay' });
    });

    it('should reuse existing customer ID', async () => {
      dbMock.dbBarSubscription.findUnique.mockResolvedValue({ stripeCustomerId: mockCustomerId });
      dbMock.dbBar.findUnique.mockResolvedValue({ name: 'My Bar' });

      await service.createCheckoutSession(
        mockBarId,
        SubscriptionPlan.PRO_YEARLY,
        'https://app.com/success',
        'https://app.com/cancel',
      );

      expect(stripeMock.customers.update).toHaveBeenCalledWith(mockCustomerId, { name: 'My Bar' });
      expect(stripeMock.checkout.sessions.create).toHaveBeenCalledWith(
        expect.objectContaining({
          customer: mockCustomerId,
          line_items: [{ price: mockPriceYearly, quantity: 1 }],
        }),
      );
    });

    it('should throw InternalServerErrorException if price config is missing', async () => {
      configServiceMock.get.mockReturnValue(undefined);

      await expect(
        service.createCheckoutSession(mockBarId, SubscriptionPlan.PRO_MONTHLY, 'http://s', 'http://c'),
      ).rejects.toThrow(InternalServerErrorException);
    });
  });

  describe('createCustomerPortalSession', () => {
    it('should create customer portal session when customer exists', async () => {
      dbMock.dbBarSubscription.findUnique.mockResolvedValue({ stripeCustomerId: mockCustomerId });

      const result = await service.createCustomerPortalSession(mockBarId, 'https://app.com/return');

      expect(stripeMock.billingPortal.sessions.create).toHaveBeenCalledWith({
        customer: mockCustomerId,
        return_url: 'https://app.com/return',
      });
      expect(result).toEqual({ url: 'https://billing.stripe.com/session' });
    });

    it('should throw BadRequestException when no stripe customer found', async () => {
      dbMock.dbBarSubscription.findUnique.mockResolvedValue(null);

      await expect(
        service.createCustomerPortalSession(mockBarId, 'https://app.com/return'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('getBarSubscription', () => {
    it('should return default FREE inactive subscription when not found', async () => {
      dbMock.dbBarSubscription.findUnique.mockResolvedValue(null);

      const result = await service.getBarSubscription(mockBarId);

      expect(result).toEqual({
        barId: mockBarId,
        plan: SubscriptionPlan.FREE,
        status: SubscriptionStatus.INACTIVE,
        cancelAtPeriodEnd: false,
      });
    });

    it('should return mapped subscription when found', async () => {
      const now = new Date();
      dbMock.dbBarSubscription.findUnique.mockResolvedValue({
        barId: mockBarId,
        plan: DbSubscriptionPlan.PRO_MONTHLY,
        status: DbSubscriptionStatus.ACTIVE,
        cancelAtPeriodEnd: false,
        currentPeriodStart: now,
        currentPeriodEnd: now,
        canceledAt: null,
        stripeCustomerId: mockCustomerId,
        stripeSubscriptionId: mockSubscriptionId,
      });

      const result = await service.getBarSubscription(mockBarId);

      expect(result).toEqual({
        barId: mockBarId,
        plan: DbSubscriptionPlan.PRO_MONTHLY,
        status: DbSubscriptionStatus.ACTIVE,
        cancelAtPeriodEnd: false,
        currentPeriodStart: now.toISOString(),
        currentPeriodEnd: now.toISOString(),
        canceledAt: undefined,
        stripeCustomerId: mockCustomerId,
        stripeSubscriptionId: mockSubscriptionId,
      });
    });
  });

  describe('handleStripeWebhook', () => {
    it('should throw InternalServerErrorException if webhook secret is missing', async () => {
      configServiceMock.get.mockImplementation((k: string) => (k === 'STRIPE_WEBHOOK_SECRET' ? undefined : 'val'));

      await expect(service.handleStripeWebhook('{}', 'sig')).rejects.toThrow(InternalServerErrorException);
    });

    it('should throw BadRequestException if signature is missing', async () => {
      await expect(service.handleStripeWebhook('{}', undefined)).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if signature verification fails', async () => {
      stripeMock.webhooks.constructEvent.mockImplementation(() => {
        throw new Error('Invalid sig');
      });

      await expect(service.handleStripeWebhook('{}', 'invalid_sig')).rejects.toThrow(BadRequestException);
    });

    it('should skip processing if event was already processed', async () => {
      const mockEvent = { id: 'evt_123', type: 'customer.subscription.updated', data: { object: {} } };
      stripeMock.webhooks.constructEvent.mockReturnValue(mockEvent);
      dbMock.dbStripeWebhookEvent.findUnique.mockResolvedValue({ id: 'local_123' });

      await service.handleStripeWebhook('{}', 'valid_sig');

      expect(dbMock.dbBarSubscription.upsert).not.toHaveBeenCalled();
      expect(dbMock.dbStripeWebhookEvent.create).not.toHaveBeenCalled();
    });

    it('should handle checkout.session.completed event', async () => {
      const mockSession = {
        id: 'cs_123',
        mode: 'subscription',
        client_reference_id: mockBarId,
        customer: mockCustomerId,
        subscription: mockSubscriptionId,
        metadata: { barId: mockBarId },
      };
      const mockEvent = { id: 'evt_checkout', type: 'checkout.session.completed', data: { object: mockSession } };
      stripeMock.webhooks.constructEvent.mockReturnValue(mockEvent);
      dbMock.dbStripeWebhookEvent.findUnique.mockResolvedValue(null);

      await service.handleStripeWebhook('{}', 'valid_sig');

      expect(dbMock.dbBarSubscription.upsert).toHaveBeenCalledWith({
        where: { barId: mockBarId },
        create: { barId: mockBarId, stripeCustomerId: mockCustomerId, stripeSubscriptionId: mockSubscriptionId },
        update: { stripeCustomerId: mockCustomerId, stripeSubscriptionId: mockSubscriptionId },
      });
      expect(dbMock.dbStripeWebhookEvent.create).toHaveBeenCalledWith({
        data: { stripeEventId: 'evt_checkout', type: 'checkout.session.completed', payload: mockEvent },
      });
    });

    it('should handle customer.subscription.created / updated with period dates and publish event', async () => {
      const startTime = Math.floor(Date.now() / 1000);
      const endTime = startTime + 30 * 24 * 3600;
      const mockSub = {
        id: mockSubscriptionId,
        customer: mockCustomerId,
        status: 'active',
        cancel_at_period_end: false,
        canceled_at: null,
        items: {
          data: [
            {
              current_period_start: startTime,
              current_period_end: endTime,
              price: { id: mockPriceMonthly },
            },
          ],
        },
        metadata: { barId: mockBarId },
      };
      const mockEvent = { id: 'evt_sub_created', type: 'customer.subscription.created', data: { object: mockSub } };
      stripeMock.webhooks.constructEvent.mockReturnValue(mockEvent);
      dbMock.dbStripeWebhookEvent.findUnique.mockResolvedValue(null);
      dbMock.dbBarSubscription.findFirst.mockResolvedValue({ barId: mockBarId });

      await service.handleStripeWebhook('{}', 'valid_sig');

      expect(dbMock.dbBarSubscription.upsert).toHaveBeenCalledWith({
        where: { barId: mockBarId },
        create: expect.objectContaining({
          stripeCustomerId: mockCustomerId,
          stripeSubscriptionId: mockSubscriptionId,
          plan: DbSubscriptionPlan.PRO_MONTHLY,
          status: DbSubscriptionStatus.ACTIVE,
          currentPeriodStart: new Date(startTime * 1000),
          currentPeriodEnd: new Date(endTime * 1000),
        }),
        update: expect.objectContaining({
          stripeCustomerId: mockCustomerId,
          stripeSubscriptionId: mockSubscriptionId,
          plan: DbSubscriptionPlan.PRO_MONTHLY,
          status: DbSubscriptionStatus.ACTIVE,
          currentPeriodStart: new Date(startTime * 1000),
          currentPeriodEnd: new Date(endTime * 1000),
        }),
      });
      expect(eventBusMock.publish).toHaveBeenCalled();
    });

    it('should handle invoice.payment_failed event and mark status PAST_DUE', async () => {
      const mockInvoice = {
        id: 'in_123',
        customer: mockCustomerId,
        parent: {
          type: 'subscription_details',
          quote_details: null,
          subscription_details: {
            metadata: null,
            subscription: mockSubscriptionId,
          },
        },
      };
      const mockEvent = { id: 'evt_inv_failed', type: 'invoice.payment_failed', data: { object: mockInvoice } };
      stripeMock.webhooks.constructEvent.mockReturnValue(mockEvent);
      dbMock.dbStripeWebhookEvent.findUnique.mockResolvedValue(null);
      dbMock.dbBarSubscription.findMany.mockResolvedValue([{ barId: mockBarId }]);

      await service.handleStripeWebhook('{}', 'valid_sig');

      expect(dbMock.dbBarSubscription.updateMany).toHaveBeenCalledWith({
        where: { stripeSubscriptionId: mockSubscriptionId },
        data: { status: DbSubscriptionStatus.PAST_DUE },
      });
      expect(eventBusMock.publish).toHaveBeenCalled();
    });
  });
});
