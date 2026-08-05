import { SubscriptionPlan, SubscriptionStatus } from '@coaster/common';
import { Test, TestingModule } from '@nestjs/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { asBarId } from '../../../core';
import { BarSubscriptionReadRepository } from '../../data-access/bar-subscription.read.repository';
import { FindBarSubscriptionQuery } from '../impl/find-bar-subscription.query';
import { FindBarSubscriptionHandler } from './find-bar-subscription.handler';

describe('FindBarSubscriptionHandler', () => {
  let handler: FindBarSubscriptionHandler;
  const readRepo = {
    findByBarId: vi.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FindBarSubscriptionHandler,
        { provide: BarSubscriptionReadRepository, useValue: readRepo },
      ],
    }).compile();

    handler = module.get<FindBarSubscriptionHandler>(FindBarSubscriptionHandler);
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

  it('should return null when subscription is not found', async () => {
    const barId = asBarId('bar-999');
    readRepo.findByBarId.mockResolvedValue(null);

    const result = await handler.execute(new FindBarSubscriptionQuery(barId));

    expect(readRepo.findByBarId).toHaveBeenCalledWith(barId);
    expect(result).toBeNull();
  });
});
