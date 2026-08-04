import { BarId } from '@coaster/common';
import Stripe from 'stripe';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DbSubscriptionPlan, DbSubscriptionStatus } from '../../core/db';
import {
  BillingWriteRepository,
  StripeWebhookProcessingStatus,
  UpsertSubscriptionData,
} from './billing.write.repository';

describe('BillingWriteRepository', () => {
  let repository: BillingWriteRepository;
  let dbMock: any;

  beforeEach(() => {
    dbMock = {
      dbBarSubscription: {
        findUnique: vi.fn(),
        upsert: vi.fn(),
        updateMany: vi.fn(),
      },
      dbStripeWebhookEvent: {
        create: vi.fn(),
        findUnique: vi.fn(),
        update: vi.fn(),
        updateMany: vi.fn(),
      },
    };

    repository = new BillingWriteRepository(dbMock as any);
  });

  it('should link Stripe references without activating the local subscription', async () => {
    const barId = 'bar_123' as BarId;
    dbMock.dbBarSubscription.upsert.mockResolvedValue({ barId, stripeCustomerId: 'cus_123' });

    const result = await repository.linkStripeReferences(barId, 'cus_123', 'sub_123');

    expect(dbMock.dbBarSubscription.upsert).toHaveBeenCalledWith({
      where: { barId },
      create: {
        barId,
        stripeCustomerId: 'cus_123',
        stripeSubscriptionId: 'sub_123',
        plan: DbSubscriptionPlan.FREE,
        status: DbSubscriptionStatus.INACTIVE,
      },
      update: {
        stripeCustomerId: 'cus_123',
        stripeSubscriptionId: 'sub_123',
      },
    });
    expect(result).toEqual({ barId, stripeCustomerId: 'cus_123' });
  });

  it('should upsert subscription details', async () => {
    const barId = 'bar_123' as BarId;
    const data: UpsertSubscriptionData = {
      stripeCustomerId: 'cus_123',
      stripeSubscriptionId: 'sub_123',
      plan: DbSubscriptionPlan.PRO,
      status: DbSubscriptionStatus.ACTIVE,
      currentPeriodStart: new Date(),
      currentPeriodEnd: new Date(),
      trialEndsAt: null,
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

  it('should claim a new webhook event once', async () => {
    const event = { id: 'evt_new', type: 'invoice.paid' } as Stripe.Event;
    dbMock.dbStripeWebhookEvent.findUnique.mockResolvedValue(null);

    await expect(repository.claimStripeWebhookEvent(event)).resolves.toBe(true);
    expect(dbMock.dbStripeWebhookEvent.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        stripeEventId: 'evt_new',
        type: 'invoice.paid',
        processingStatus: 'PROCESSING',
        attempts: 1,
      }),
    });
  });

  it('should ignore a processed duplicate and reclaim a failed event', async () => {
    const event = { id: 'evt_duplicate', type: 'invoice.paid' } as Stripe.Event;
    dbMock.dbStripeWebhookEvent.findUnique.mockResolvedValueOnce({
      stripeEventId: event.id,
      processingStatus: 'PROCESSED',
    });

    await expect(repository.claimStripeWebhookEvent(event)).resolves.toBe(false);

    dbMock.dbStripeWebhookEvent.findUnique.mockResolvedValueOnce({
      stripeEventId: event.id,
      processingStatus: 'FAILED',
    });
    dbMock.dbStripeWebhookEvent.updateMany.mockResolvedValueOnce({ count: 1 });

    await expect(repository.claimStripeWebhookEvent(event)).resolves.toBe(true);
    expect(dbMock.dbStripeWebhookEvent.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ stripeEventId: event.id }),
        data: expect.objectContaining({ processingStatus: 'PROCESSING' }),
      }),
    );
  });

  it('should reclaim a processed checkout event when its subscription projection was deleted', async () => {
    const event = {
      id: 'evt_repair',
      type: 'checkout.session.completed',
      data: { object: { metadata: { barId: 'bar_123' }, client_reference_id: null } },
    } as unknown as Stripe.Event;
    dbMock.dbStripeWebhookEvent.findUnique.mockResolvedValue({
      stripeEventId: event.id,
      processingStatus: StripeWebhookProcessingStatus.PROCESSED,
    });
    dbMock.dbBarSubscription.findUnique.mockResolvedValue(null);
    dbMock.dbStripeWebhookEvent.updateMany.mockResolvedValue({ count: 1 });

    await expect(repository.claimStripeWebhookEvent(event)).resolves.toBe(true);

    expect(dbMock.dbStripeWebhookEvent.updateMany).toHaveBeenCalledWith({
      where: {
        stripeEventId: event.id,
        processingStatus: StripeWebhookProcessingStatus.PROCESSED,
      },
      data: {
        processingStatus: StripeWebhookProcessingStatus.PROCESSING,
        attempts: { increment: 1 },
        processedAt: null,
        lastError: null,
      },
    });
  });
});
