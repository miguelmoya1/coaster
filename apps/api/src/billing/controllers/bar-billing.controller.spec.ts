import { BarId, SubscriptionPlan } from '@coaster/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CreateCheckoutSessionCommand, CreateCustomerPortalSessionCommand } from '../commands';
import { GetBarSubscriptionQuery } from '../queries';
import { BarBillingController } from './bar-billing.controller';

describe('BarBillingController', () => {
  let controller: BarBillingController;
  let commandBusMock: any;
  let queryBusMock: any;

  beforeEach(() => {
    commandBusMock = {
      execute: vi.fn(),
    };
    queryBusMock = {
      execute: vi.fn(),
    };

    controller = new BarBillingController(commandBusMock, queryBusMock);
  });

  it('should execute GetBarSubscriptionQuery on getSubscription', async () => {
    const barId = 'bar_123' as BarId;
    const mockSubscription = { barId, plan: SubscriptionPlan.PRO_MONTHLY };
    queryBusMock.execute.mockResolvedValue(mockSubscription);

    const result = await controller.getSubscription(barId);

    expect(queryBusMock.execute).toHaveBeenCalledWith(new GetBarSubscriptionQuery(barId));
    expect(result).toEqual(mockSubscription);
  });

  it('should execute CreateCheckoutSessionCommand on createCheckoutSession', async () => {
    const barId = 'bar_123' as BarId;
    const dto = {
      plan: SubscriptionPlan.PRO_MONTHLY as Exclude<SubscriptionPlan, 'FREE'>,
      successUrl: 'https://example.com/success',
      cancelUrl: 'https://example.com/cancel',
    };
    const mockResponse = { id: 'cs_123', url: 'https://stripe.com/checkout' };
    commandBusMock.execute.mockResolvedValue(mockResponse);

    const result = await controller.createCheckoutSession(barId, dto);

    expect(commandBusMock.execute).toHaveBeenCalledWith(
      new CreateCheckoutSessionCommand(barId, dto.plan, dto.successUrl, dto.cancelUrl),
    );
    expect(result).toEqual(mockResponse);
  });

  it('should execute CreateCustomerPortalSessionCommand on createCustomerPortalSession', async () => {
    const barId = 'bar_123' as BarId;
    const dto = { returnUrl: 'https://example.com/return' };
    const mockResponse = { url: 'https://stripe.com/portal' };
    commandBusMock.execute.mockResolvedValue(mockResponse);

    const result = await controller.createCustomerPortalSession(barId, dto);

    expect(commandBusMock.execute).toHaveBeenCalledWith(new CreateCustomerPortalSessionCommand(barId, dto.returnUrl));
    expect(result).toEqual(mockResponse);
  });
});
