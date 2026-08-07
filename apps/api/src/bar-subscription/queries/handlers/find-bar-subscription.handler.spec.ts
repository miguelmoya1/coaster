import { SubscriptionPlan, SubscriptionStatus } from '@coaster/common';
import { asBarId } from '@coaster/core';
import { Test, TestingModule } from '@nestjs/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { BarSubscriptionReadRepository } from '../../data-access/bar-subscription.read.repository';
import { FindBarSubscriptionQuery } from '../impl/find-bar-subscription.query';
import { FindBarSubscriptionHandler } from './find-bar-subscription.handler';

describe('FindBarSubscriptionHandler', () => {
  let handler: FindBarSubscriptionHandler;
  const readRepo = {
    findByBarId: vi.fn(),
  };

  beforeEach(async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-15T00:00:00.000Z'));

    const module: TestingModule = await Test.createTestingModule({
      providers: [FindBarSubscriptionHandler, { provide: BarSubscriptionReadRepository, useValue: readRepo }],
    }).compile();

    handler = module.get<FindBarSubscriptionHandler>(FindBarSubscriptionHandler);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should return subscription domain object when found', async () => {
    const barId = asBarId('bar-123');
    readRepo.findByBarId.mockResolvedValue({
      id: 'sub-1',
      barId: 'bar-123',
      plan: SubscriptionPlan.PRO,
      status: SubscriptionStatus.ACTIVE,
      stripeCustomerId: 'cus_123',
      stripeSubscriptionId: 'sub_123',
      currentPeriodStart: new Date('2026-01-01'),
      currentPeriodEnd: new Date('2026-02-01'),
      trialEndsAt: null,
      canceledAt: null,
      createdAt: new Date('2026-01-01'),
      updatedAt: new Date('2026-01-01'),
    });

    const result = await handler.execute(new FindBarSubscriptionQuery(barId));

    expect(readRepo.findByBarId).toHaveBeenCalledWith(barId);
    expect(result).toEqual({
      id: 'sub-1',
      barId: 'bar-123',
      plan: SubscriptionPlan.PRO,
      status: SubscriptionStatus.ACTIVE,
      stripeCustomerId: 'cus_123',
      stripeSubscriptionId: 'sub_123',
      currentPeriodStart: new Date('2026-01-01').toISOString(),
      currentPeriodEnd: new Date('2026-02-01').toISOString(),
      trialEndsAt: null,
      canceledAt: null,
      createdAt: new Date('2026-01-01').toISOString(),
      updatedAt: new Date('2026-01-01').toISOString(),
    });
  });

  it('should return a default FREE/INACTIVE subscription when the bar has none', async () => {
    const barId = asBarId('bar-999');
    readRepo.findByBarId.mockResolvedValue(null);

    const result = await handler.execute(new FindBarSubscriptionQuery(barId));

    expect(readRepo.findByBarId).toHaveBeenCalledWith(barId);
    expect(result).toEqual(
      expect.objectContaining({
        barId,
        plan: SubscriptionPlan.FREE,
        status: SubscriptionStatus.INACTIVE,
        stripeCustomerId: null,
        stripeSubscriptionId: null,
        currentPeriodEnd: null,
      }),
    );
  });

  it('should report a lapsed period as EXPIRED without waiting for a webhook', async () => {
    const barId = asBarId('bar-123');
    readRepo.findByBarId.mockResolvedValue({
      id: 'sub-1',
      barId: 'bar-123',
      plan: SubscriptionPlan.PRO,
      status: SubscriptionStatus.ACTIVE,
      stripeCustomerId: 'cus_123',
      stripeSubscriptionId: 'sub_123',
      currentPeriodStart: new Date('2025-12-01'),
      currentPeriodEnd: new Date('2026-01-01'),
      trialEndsAt: null,
      canceledAt: null,
      createdAt: new Date('2025-12-01'),
      updatedAt: new Date('2025-12-01'),
    });

    const result = await handler.execute(new FindBarSubscriptionQuery(barId));

    expect(result.status).toBe(SubscriptionStatus.EXPIRED);
  });
});
