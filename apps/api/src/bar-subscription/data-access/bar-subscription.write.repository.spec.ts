import { SubscriptionPlan, SubscriptionStatus } from '@coaster/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { asBarId } from '../../core';
import type { DbService } from '../../core/db';
import { BarSubscriptionWriteRepository } from './bar-subscription.write.repository';

describe('BarSubscriptionWriteRepository', () => {
  let repository: BarSubscriptionWriteRepository;
  let dbMock: {
    dbBarSubscription: {
      create: ReturnType<typeof vi.fn>;
      update: ReturnType<typeof vi.fn>;
      upsert: ReturnType<typeof vi.fn>;
    };
  };

  beforeEach(() => {
    dbMock = {
      dbBarSubscription: {
        create: vi.fn(),
        update: vi.fn(),
        upsert: vi.fn(),
      },
    };
    repository = new BarSubscriptionWriteRepository(dbMock as unknown as DbService);
  });

  it('should create subscription data with barId', async () => {
    const barId = asBarId('bar-123');
    const createDto = {
      plan: SubscriptionPlan.PRO,
      status: SubscriptionStatus.ACTIVE,
      stripeCustomerId: 'cus_123',
      stripeSubscriptionId: 'sub_123',
    };
    dbMock.dbBarSubscription.create.mockResolvedValue({ id: 'sub-1', barId, ...createDto });

    const result = await repository.create(barId, createDto as any);

    expect(dbMock.dbBarSubscription.create).toHaveBeenCalledWith({
      data: { ...createDto, barId },
    });
    expect(result).toEqual({ id: 'sub-1', barId, ...createDto });
  });

  it('should update subscription data by barId', async () => {
    const barId = asBarId('bar-123');
    const updateDto = {
      status: SubscriptionStatus.CANCELED,
    };
    dbMock.dbBarSubscription.update.mockResolvedValue({ id: 'sub-1', barId, ...updateDto });

    const result = await repository.update(barId, updateDto as any);

    expect(dbMock.dbBarSubscription.update).toHaveBeenCalledWith({
      where: { barId },
      data: { ...updateDto, barId },
    });
    expect(result).toEqual({ id: 'sub-1', barId, ...updateDto });
  });

  it('should upsert subscription data by barId', async () => {
    const barId = asBarId('bar-123');
    const createDto = {
      plan: SubscriptionPlan.PRO,
      status: SubscriptionStatus.ACTIVE,
    };
    const updateDto = {
      status: SubscriptionStatus.ACTIVE,
    };
    dbMock.dbBarSubscription.upsert.mockResolvedValue({ id: 'sub-1', barId, ...createDto });

    const result = await repository.upsert(barId, createDto as any, updateDto as any);

    expect(dbMock.dbBarSubscription.upsert).toHaveBeenCalledWith({
      where: { barId },
      create: { ...createDto, barId },
      update: { ...updateDto, barId },
    });
    expect(result).toEqual({ id: 'sub-1', barId, ...createDto });
  });
});
