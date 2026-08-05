import type { BarId } from '@coaster/common';
import { SubscriptionPlan, SubscriptionStatus } from '@coaster/common';
import { QueryBus } from '@nestjs/cqrs';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { asBarId } from '../../core';
import { FindBarSubscriptionQuery } from '../queries';
import { BarSubscriptionController } from './bar-subscription.controller';

describe('BarSubscriptionController', () => {
  let controller: BarSubscriptionController;
  let queryBusMock: { execute: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    queryBusMock = {
      execute: vi.fn(),
    };
    controller = new BarSubscriptionController(queryBusMock as unknown as QueryBus);
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
});
