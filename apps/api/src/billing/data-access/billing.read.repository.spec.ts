import { BarId } from '@coaster/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { BillingReadRepository } from './billing.read.repository';

describe('BillingReadRepository', () => {
  let repository: BillingReadRepository;
  let dbMock: any;

  beforeEach(() => {
    dbMock = {
      dbBarSubscription: {
        findUnique: vi.fn(),
        findFirst: vi.fn(),
        findMany: vi.fn(),
      },
      dbStripeWebhookEvent: {
        findUnique: vi.fn(),
      },
      dbBar: {
        findUnique: vi.fn(),
      },
    };

    repository = new BillingReadRepository(dbMock as any);
  });

  it('should find subscription by barId', async () => {
    const barId = 'bar_123' as BarId;
    const mockSub = { barId, plan: 'PRO_MONTHLY' };
    dbMock.dbBarSubscription.findUnique.mockResolvedValue(mockSub);

    const result = await repository.findSubscriptionByBarId(barId);

    expect(dbMock.dbBarSubscription.findUnique).toHaveBeenCalledWith({ where: { barId } });
    expect(result).toEqual(mockSub);
  });

  it('should find subscription by stripeSubscriptionId if found, else stripeCustomerId', async () => {
    const mockSub = { barId: 'bar_1', stripeSubscriptionId: 'sub_123' };
    dbMock.dbBarSubscription.findFirst.mockResolvedValueOnce(mockSub);

    const result = await repository.findSubscriptionByStripeIds('sub_123', 'cus_123');

    expect(result).toEqual(mockSub);
    expect(dbMock.dbBarSubscription.findFirst).toHaveBeenCalledTimes(1);
  });

  it('should fallback to finding by stripeCustomerId if stripeSubscriptionId not found', async () => {
    const mockSub = { barId: 'bar_1', stripeCustomerId: 'cus_123' };
    dbMock.dbBarSubscription.findFirst.mockResolvedValueOnce(null).mockResolvedValueOnce(mockSub);

    const result = await repository.findSubscriptionByStripeIds('sub_123', 'cus_123');

    expect(result).toEqual(mockSub);
    expect(dbMock.dbBarSubscription.findFirst).toHaveBeenCalledTimes(2);
  });

  it('should return empty array if subscriptionId and customerId are both missing in findSubscriptionsByStripeIds', async () => {
    const result = await repository.findSubscriptionsByStripeIds(null, null);
    expect(result).toEqual([]);
  });

  it('should find subscriptions by subscriptionId or customerId', async () => {
    const mockSubs = [{ barId: 'bar_1' }];
    dbMock.dbBarSubscription.findMany.mockResolvedValue(mockSubs);

    const result = await repository.findSubscriptionsByStripeIds('sub_123', 'cus_123');

    expect(dbMock.dbBarSubscription.findMany).toHaveBeenCalledWith({
      where: { stripeSubscriptionId: 'sub_123' },
      select: { barId: true },
    });
    expect(result).toEqual(mockSubs);
  });

  it('should find webhook event by stripeEventId', async () => {
    const mockEvent = { stripeEventId: 'evt_123' };
    dbMock.dbStripeWebhookEvent.findUnique.mockResolvedValue(mockEvent);

    const result = await repository.findWebhookEventById('evt_123');

    expect(dbMock.dbStripeWebhookEvent.findUnique).toHaveBeenCalledWith({ where: { stripeEventId: 'evt_123' } });
    expect(result).toEqual(mockEvent);
  });

  it('should find bar by barId', async () => {
    const barId = 'bar_123' as BarId;
    const mockBar = { id: barId, name: 'My Bar' };
    dbMock.dbBar.findUnique.mockResolvedValue(mockBar);

    const result = await repository.findBarById(barId);

    expect(dbMock.dbBar.findUnique).toHaveBeenCalledWith({ where: { id: barId } });
    expect(result).toEqual(mockBar);
  });
});
