import { BarPermission, SubscriptionPlan, SubscriptionStatus } from '@coaster/common';
import { asBarId, BAR_PERMISSIONS_KEY } from '@coaster/core';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CreateCheckoutSessionCommand, CreateCustomerPortalSessionCommand } from '../commands';
import { CreateCheckoutSessionDto, CreateCustomerPortalSessionDto } from '../dto';
import { FindBarSubscriptionQuery } from '../queries';
import { BarSubscriptionController } from './bar-subscription.controller';

describe('BarSubscriptionController', () => {
  let controller: BarSubscriptionController;
  let commandBusMock: { execute: ReturnType<typeof vi.fn> };
  let queryBusMock: { execute: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    commandBusMock = {
      execute: vi.fn(),
    };
    queryBusMock = {
      execute: vi.fn(),
    };
    controller = new BarSubscriptionController(
      commandBusMock as unknown as CommandBus,
      queryBusMock as unknown as QueryBus,
    );
  });

  it('should execute FindBarSubscriptionQuery and return subscription', async () => {
    const barId = asBarId('bar-123');
    const mockSubscription = {
      id: 'sub-1',
      barId,
      plan: SubscriptionPlan.PRO,
      status: SubscriptionStatus.ACTIVE,
      stripeCustomerId: 'cus_123',
      stripeSubscriptionId: 'sub_123',
      currentPeriodStart: '2026-01-01T00:00:00.000Z',
      currentPeriodEnd: '2026-02-01T00:00:00.000Z',
      trialEndsAt: null,
      canceledAt: null,
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    };
    queryBusMock.execute.mockResolvedValue(mockSubscription);

    const result = await controller.getBarSubscription(barId);

    expect(queryBusMock.execute).toHaveBeenCalledWith(new FindBarSubscriptionQuery(barId));
    expect(result).toEqual(mockSubscription);
  });

  it('should execute CreateCheckoutSessionCommand on createCheckoutSession', async () => {
    const barId = asBarId('bar-123');
    const dto: CreateCheckoutSessionDto = { plan: SubscriptionPlan.PRO };
    const expectedResponse = { id: 'cs_123', url: 'https://checkout.stripe.com' };
    commandBusMock.execute.mockResolvedValue(expectedResponse);

    const result = await controller.createCheckoutSession(barId, dto);

    expect(commandBusMock.execute).toHaveBeenCalledWith(new CreateCheckoutSessionCommand(barId, dto.plan));
    expect(result).toEqual(expectedResponse);
  });

  describe('required permissions', () => {
    const permissionsOf = (handler: (...args: never[]) => unknown): BarPermission[] | undefined =>
      Reflect.getMetadata(BAR_PERMISSIONS_KEY, handler);

    it('should let any member of the bar read the subscription, since the whole UI depends on it', () => {
      expect(permissionsOf(BarSubscriptionController.prototype.getBarSubscription)).toBeUndefined();
    });

    it('should keep the billing actions behind BAR_MANAGE_BILLING', () => {
      expect(permissionsOf(BarSubscriptionController.prototype.createCheckoutSession)).toEqual([
        BarPermission.BAR_MANAGE_BILLING,
      ]);
      expect(permissionsOf(BarSubscriptionController.prototype.createCustomerPortalSession)).toEqual([
        BarPermission.BAR_MANAGE_BILLING,
      ]);
    });
  });

  it('should execute CreateCustomerPortalSessionCommand on createCustomerPortalSession', async () => {
    const barId = asBarId('bar-123');
    const dto: CreateCustomerPortalSessionDto = {};
    const expectedResponse = { url: 'https://portal.stripe.com' };
    commandBusMock.execute.mockResolvedValue(expectedResponse);

    const result = await controller.createCustomerPortalSession(barId, dto);

    expect(commandBusMock.execute).toHaveBeenCalledWith(new CreateCustomerPortalSessionCommand(barId));
    expect(result).toEqual(expectedResponse);
  });
});
