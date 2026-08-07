import { SubscriptionPlan, SubscriptionStatus, asBarId } from '@coaster/common';
import type { DbService } from '@coaster/core/db';
import { Logger } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { BarSubscriptionWriteRepository } from './bar-subscription.write.repository';

describe('BarSubscriptionWriteRepository', () => {
  let repository: BarSubscriptionWriteRepository;
  let dbMock: {
    dbBarSubscription: {
      create: ReturnType<typeof vi.fn>;
      update: ReturnType<typeof vi.fn>;
      upsert: ReturnType<typeof vi.fn>;
      updateMany: ReturnType<typeof vi.fn>;
      findMany: ReturnType<typeof vi.fn>;
    };
    $transaction: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    vi.clearAllMocks();

    dbMock = {
      dbBarSubscription: {
        create: vi.fn(),
        update: vi.fn(),
        upsert: vi.fn(),
        updateMany: vi.fn().mockResolvedValue({ count: 0 }),
        findMany: vi.fn().mockResolvedValue([]),
      },
      $transaction: vi.fn().mockImplementation((cb: (tx: unknown) => unknown) => cb(dbMock)),
    };
    repository = new BarSubscriptionWriteRepository(dbMock as unknown as DbService);

    vi.spyOn(Logger.prototype, 'warn').mockReturnValue(undefined);
    vi.spyOn(Logger.prototype, 'error').mockReturnValue(undefined);
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

  describe('upsert', () => {
    it('should upsert subscription data by barId inside a transaction', async () => {
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

      expect(dbMock.$transaction).toHaveBeenCalled();
      expect(dbMock.dbBarSubscription.upsert).toHaveBeenCalledWith({
        where: { barId },
        create: { ...createDto, barId },
        update: { ...updateDto, barId },
      });
      expect(result).toEqual({ id: 'sub-1', barId, ...createDto });
    });

    it('should not touch other rows when the payload carries no Stripe ids', async () => {
      const barId = asBarId('bar-123');
      dbMock.dbBarSubscription.upsert.mockResolvedValue({ id: 'sub-1', barId });

      await repository.upsert(
        barId,
        { status: SubscriptionStatus.ACTIVE } as any,
        {
          status: SubscriptionStatus.ACTIVE,
        } as any,
      );

      expect(dbMock.dbBarSubscription.updateMany).not.toHaveBeenCalled();
    });

    it('should release a Stripe customer still linked to another bar before writing', async () => {
      const barId = asBarId('bar-123');
      dbMock.dbBarSubscription.findMany.mockResolvedValue([{ barId: 'bar-other' }]);
      dbMock.dbBarSubscription.updateMany.mockResolvedValue({ count: 1 });
      dbMock.dbBarSubscription.upsert.mockResolvedValue({ id: 'sub-1', barId });

      await repository.upsert(
        barId,
        { stripeCustomerId: 'cus_shared' } as any,
        {
          stripeCustomerId: 'cus_shared',
        } as any,
      );

      expect(dbMock.dbBarSubscription.updateMany).toHaveBeenCalledWith({
        where: { stripeCustomerId: 'cus_shared', barId: { not: barId } },
        data: { stripeCustomerId: null },
      });
      expect(dbMock.dbBarSubscription.upsert).toHaveBeenCalled();
    });

    it('should name the bar that lost its billing link so the incident is traceable', async () => {
      const barId = asBarId('bar-123');
      const error = vi.spyOn(Logger.prototype, 'error').mockReturnValue(undefined);
      dbMock.dbBarSubscription.findMany.mockResolvedValue([{ barId: 'bar-other' }]);
      dbMock.dbBarSubscription.updateMany.mockResolvedValue({ count: 1 });
      dbMock.dbBarSubscription.upsert.mockResolvedValue({ id: 'sub-1', barId });

      await repository.upsert(barId, { stripeCustomerId: 'cus_shared' } as any, {} as any);

      const message = error.mock.calls.at(-1)?.[0] as string;
      expect(message).toContain('cus_shared');
      expect(message).toContain('bar-other');
      expect(message).toContain('bar-123');
    });

    it('should leave other rows alone when nobody else holds the id', async () => {
      const barId = asBarId('bar-123');
      dbMock.dbBarSubscription.findMany.mockResolvedValue([]);
      dbMock.dbBarSubscription.upsert.mockResolvedValue({ id: 'sub-1', barId });

      await repository.upsert(barId, { stripeCustomerId: 'cus_free' } as any, {} as any);

      expect(dbMock.dbBarSubscription.updateMany).not.toHaveBeenCalled();
      expect(dbMock.dbBarSubscription.upsert).toHaveBeenCalled();
    });

    it('should release a Stripe subscription still linked to another bar before writing', async () => {
      const barId = asBarId('bar-123');
      dbMock.dbBarSubscription.findMany.mockResolvedValue([{ barId: 'bar-other' }]);
      dbMock.dbBarSubscription.updateMany.mockResolvedValue({ count: 1 });
      dbMock.dbBarSubscription.upsert.mockResolvedValue({ id: 'sub-1', barId });

      await repository.upsert(
        barId,
        { stripeSubscriptionId: 'sub_shared' } as any,
        {
          stripeSubscriptionId: 'sub_shared',
        } as any,
      );

      expect(dbMock.dbBarSubscription.updateMany).toHaveBeenCalledWith({
        where: { stripeSubscriptionId: 'sub_shared', barId: { not: barId } },
        data: { stripeSubscriptionId: null },
      });
    });

    it('should not release anything when the subscription id is being cleared', async () => {
      const barId = asBarId('bar-123');
      dbMock.dbBarSubscription.upsert.mockResolvedValue({ id: 'sub-1', barId });

      await repository.upsert(
        barId,
        { stripeSubscriptionId: null } as any,
        {
          stripeSubscriptionId: null,
        } as any,
      );

      expect(dbMock.dbBarSubscription.updateMany).not.toHaveBeenCalled();
    });
  });
});
