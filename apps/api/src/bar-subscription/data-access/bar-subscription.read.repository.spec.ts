import { asBarId } from '@coaster/core';
import type { DbService } from '@coaster/core/db';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { BarSubscriptionReadRepository } from './bar-subscription.read.repository';

describe('BarSubscriptionReadRepository', () => {
  let repository: BarSubscriptionReadRepository;
  let dbMock: { dbBarSubscription: { findUnique: ReturnType<typeof vi.fn> } };

  beforeEach(() => {
    dbMock = {
      dbBarSubscription: {
        findUnique: vi.fn(),
      },
    };
    repository = new BarSubscriptionReadRepository(dbMock as unknown as DbService);
  });

  it('should find subscription by barId', async () => {
    const barId = asBarId('bar-123');
    dbMock.dbBarSubscription.findUnique.mockResolvedValue({ id: 'sub-1', barId });

    const result = await repository.findByBarId(barId);

    expect(dbMock.dbBarSubscription.findUnique).toHaveBeenCalledWith({
      where: { barId },
    });
    expect(result).toEqual({ id: 'sub-1', barId });
  });

  it('should find subscription by stripeCustomerId', async () => {
    const customerId = 'cus_123';
    dbMock.dbBarSubscription.findUnique.mockResolvedValue({ id: 'sub-1', stripeCustomerId: customerId });

    const result = await repository.findByStripeCustomerId(customerId);

    expect(dbMock.dbBarSubscription.findUnique).toHaveBeenCalledWith({
      where: { stripeCustomerId: customerId },
    });
    expect(result).toEqual({ id: 'sub-1', stripeCustomerId: customerId });
  });

  it('should find subscription by stripeSubscriptionId', async () => {
    const subscriptionId = 'sub_123';
    dbMock.dbBarSubscription.findUnique.mockResolvedValue({ id: 'sub-1', stripeSubscriptionId: subscriptionId });

    const result = await repository.findByStripeSubscriptionId(subscriptionId);

    expect(dbMock.dbBarSubscription.findUnique).toHaveBeenCalledWith({
      where: { stripeSubscriptionId: subscriptionId },
    });
    expect(result).toEqual({ id: 'sub-1', stripeSubscriptionId: subscriptionId });
  });
});
