import { BarId } from '@coaster/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DbSubscriptionPlan, DbSubscriptionStatus } from '../../core/db';
import { BillingWriteRepository, UpsertSubscriptionData } from './billing.write.repository';

describe('BillingWriteRepository', () => {
  let repository: BillingWriteRepository;
  let dbMock: any;

  beforeEach(() => {
    dbMock = {
      dbBarSubscription: {
        upsert: vi.fn(),
        updateMany: vi.fn(),
      },
      dbStripeWebhookEvent: {
        create: vi.fn(),
      },
    };

    repository = new BillingWriteRepository(dbMock as any);
  });

  it('should upsert bar customer ID', async () => {
    const barId = 'bar_123' as BarId;
    dbMock.dbBarSubscription.upsert.mockResolvedValue({ barId, stripeCustomerId: 'cus_123' });

    const result = await repository.upsertBarCustomerId(barId, 'cus_123', 'sub_123');

    expect(dbMock.dbBarSubscription.upsert).toHaveBeenCalledWith({
      where: { barId },
      create: {
        barId,
        stripeCustomerId: 'cus_123',
        stripeSubscriptionId: 'sub_123',
        status: DbSubscriptionStatus.ACTIVE,
      },
      update: {
        stripeCustomerId: 'cus_123',
        stripeSubscriptionId: 'sub_123',
        status: DbSubscriptionStatus.ACTIVE,
      },
    });
    expect(result).toEqual({ barId, stripeCustomerId: 'cus_123' });
  });

  it('should upsert subscription details', async () => {
    const barId = 'bar_123' as BarId;
    const data: UpsertSubscriptionData = {
      stripeCustomerId: 'cus_123',
      stripeSubscriptionId: 'sub_123',
      plan: DbSubscriptionPlan.PRO_MONTHLY,
      status: DbSubscriptionStatus.ACTIVE,
      currentPeriodStart: new Date(),
      currentPeriodEnd: new Date(),
      cancelAtPeriodEnd: false,
      canceledAt: null,
    };
    dbMock.dbBarSubscription.upsert.mockResolvedValue({ barId, ...data });

    const result = await repository.upsertSubscriptionDetails(barId, data);

    expect(dbMock.dbBarSubscription.upsert).toHaveBeenCalledWith({
      where: { barId },
      create: { barId, ...data },
      update: data,
    });
    expect(result).toEqual({ barId, ...data });
  });

  it('should return { count: 0 } if subscriptionId and customerId are missing in updateManySubscriptionsStatusToPastDue', async () => {
    const result = await repository.updateManySubscriptionsStatusToPastDue(null, null);
    expect(result).toEqual({ count: 0 });
    expect(dbMock.dbBarSubscription.updateMany).not.toHaveBeenCalled();
  });

  it('should update subscriptions status to PAST_DUE', async () => {
    dbMock.dbBarSubscription.updateMany.mockResolvedValue({ count: 1 });

    const result = await repository.updateManySubscriptionsStatusToPastDue('sub_123', null);

    expect(dbMock.dbBarSubscription.updateMany).toHaveBeenCalledWith({
      where: { stripeSubscriptionId: 'sub_123' },
      data: { status: DbSubscriptionStatus.PAST_DUE },
    });
    expect(result).toEqual({ count: 1 });
  });

  it('should record stripe webhook event', async () => {
    const payload = { id: 'evt_123', type: 'test' };
    dbMock.dbStripeWebhookEvent.create.mockResolvedValue({ id: 'db_id' });

    const result = await repository.recordStripeWebhookEvent('evt_123', 'test', payload);

    expect(dbMock.dbStripeWebhookEvent.create).toHaveBeenCalledWith({
      data: {
        stripeEventId: 'evt_123',
        type: 'test',
        payload: payload,
      },
    });
    expect(result).toEqual({ id: 'db_id' });
  });
});
