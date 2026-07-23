import { BarId, SubscriptionPlan, SubscriptionStatus } from '@coaster/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { BarBillingController } from './bar-billing.controller';

describe('BarBillingController', () => {
  let controller: BarBillingController;
  let billingServiceMock: any;

  const mockBarId = 'bar-123' as BarId;

  beforeEach(() => {
    billingServiceMock = {
      getBarSubscription: vi.fn(),
      createCheckoutSession: vi.fn(),
      createCustomerPortalSession: vi.fn(),
    };

    controller = new BarBillingController(billingServiceMock);
  });

  it('should delegate getSubscription to BillingService', async () => {
    const mockSubscription = {
      barId: mockBarId,
      plan: SubscriptionPlan.PRO_MONTHLY,
      status: SubscriptionStatus.ACTIVE,
      cancelAtPeriodEnd: false,
    };
    billingServiceMock.getBarSubscription.mockResolvedValue(mockSubscription);

    const result = await controller.getSubscription(mockBarId);

    expect(billingServiceMock.getBarSubscription).toHaveBeenCalledWith(mockBarId);
    expect(result).toEqual(mockSubscription);
  });

  it('should delegate createCheckoutSession to BillingService', async () => {
    const mockResponse = { id: 'cs_123', url: 'https://checkout.stripe.com' };
    billingServiceMock.createCheckoutSession.mockResolvedValue(mockResponse);

    const dto = {
      plan: SubscriptionPlan.PRO_MONTHLY as Exclude<SubscriptionPlan, 'FREE'>,
      successUrl: 'https://app.com/success',
      cancelUrl: 'https://app.com/cancel',
    };

    const result = await controller.createCheckoutSession(mockBarId, dto);

    expect(billingServiceMock.createCheckoutSession).toHaveBeenCalledWith(
      mockBarId,
      dto.plan,
      dto.successUrl,
      dto.cancelUrl,
    );
    expect(result).toEqual(mockResponse);
  });

  it('should delegate createCustomerPortalSession to BillingService', async () => {
    const mockResponse = { url: 'https://billing.stripe.com' };
    billingServiceMock.createCustomerPortalSession.mockResolvedValue(mockResponse);

    const dto = { returnUrl: 'https://app.com/return' };

    const result = await controller.createCustomerPortalSession(mockBarId, dto);

    expect(billingServiceMock.createCustomerPortalSession).toHaveBeenCalledWith(mockBarId, dto.returnUrl);
    expect(result).toEqual(mockResponse);
  });
});
