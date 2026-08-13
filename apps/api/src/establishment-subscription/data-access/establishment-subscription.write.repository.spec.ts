import { SubscriptionPlan, SubscriptionStatus, asEstablishmentId } from '@coaster/common';
import type { DbService } from '@coaster/core/db';
import { Logger } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { EstablishmentSubscriptionWriteRepository } from './establishment-subscription.write.repository';

describe('EstablishmentSubscriptionWriteRepository', () => {
  let repository: EstablishmentSubscriptionWriteRepository;
  let dbMock: {
    dbEstablishmentSubscription: {
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
      dbEstablishmentSubscription: {
        create: vi.fn(),
        update: vi.fn(),
        upsert: vi.fn(),
        updateMany: vi.fn().mockResolvedValue({ count: 0 }),
        findMany: vi.fn().mockResolvedValue([]),
      },
      $transaction: vi.fn().mockImplementation((cb: (tx: unknown) => unknown) => cb(dbMock)),
    };
    repository = new EstablishmentSubscriptionWriteRepository(dbMock as unknown as DbService);

    vi.spyOn(Logger.prototype, 'warn').mockReturnValue(undefined);
    vi.spyOn(Logger.prototype, 'error').mockReturnValue(undefined);
  });

  it('should create subscription data with establishmentId', async () => {
    const establishmentId = asEstablishmentId('establishment-123');
    const createDto = {
      plan: SubscriptionPlan.PRO,
      status: SubscriptionStatus.ACTIVE,
      stripeCustomerId: 'cus_123',
      stripeSubscriptionId: 'sub_123',
    };
    dbMock.dbEstablishmentSubscription.create.mockResolvedValue({ id: 'sub-1', establishmentId, ...createDto });

    const result = await repository.create(establishmentId, createDto as any);

    expect(dbMock.dbEstablishmentSubscription.create).toHaveBeenCalledWith({
      data: { ...createDto, establishmentId },
    });
    expect(result).toEqual({ id: 'sub-1', establishmentId, ...createDto });
  });

  it('should update subscription data by establishmentId', async () => {
    const establishmentId = asEstablishmentId('establishment-123');
    const updateDto = {
      status: SubscriptionStatus.CANCELED,
    };
    dbMock.dbEstablishmentSubscription.update.mockResolvedValue({ id: 'sub-1', establishmentId, ...updateDto });

    const result = await repository.update(establishmentId, updateDto as any);

    expect(dbMock.dbEstablishmentSubscription.update).toHaveBeenCalledWith({
      where: { establishmentId },
      data: { ...updateDto, establishmentId },
    });
    expect(result).toEqual({ id: 'sub-1', establishmentId, ...updateDto });
  });

  describe('upsert', () => {
    it('should upsert subscription data by establishmentId inside a transaction', async () => {
      const establishmentId = asEstablishmentId('establishment-123');
      const createDto = {
        plan: SubscriptionPlan.PRO,
        status: SubscriptionStatus.ACTIVE,
      };
      const updateDto = {
        status: SubscriptionStatus.ACTIVE,
      };
      dbMock.dbEstablishmentSubscription.upsert.mockResolvedValue({ id: 'sub-1', establishmentId, ...createDto });

      const result = await repository.upsert(establishmentId, createDto as any, updateDto as any);

      expect(dbMock.$transaction).toHaveBeenCalled();
      expect(dbMock.dbEstablishmentSubscription.upsert).toHaveBeenCalledWith({
        where: { establishmentId },
        create: { ...createDto, establishmentId },
        update: { ...updateDto, establishmentId },
      });
      expect(result).toEqual({ id: 'sub-1', establishmentId, ...createDto });
    });

    it('should not touch other rows when the payload carries no Stripe ids', async () => {
      const establishmentId = asEstablishmentId('establishment-123');
      dbMock.dbEstablishmentSubscription.upsert.mockResolvedValue({ id: 'sub-1', establishmentId });

      await repository.upsert(
        establishmentId,
        { status: SubscriptionStatus.ACTIVE } as any,
        {
          status: SubscriptionStatus.ACTIVE,
        } as any,
      );

      expect(dbMock.dbEstablishmentSubscription.updateMany).not.toHaveBeenCalled();
    });

    it('should release a Stripe customer still linked to another establishment before writing', async () => {
      const establishmentId = asEstablishmentId('establishment-123');
      dbMock.dbEstablishmentSubscription.findMany.mockResolvedValue([{ establishmentId: 'establishment-other' }]);
      dbMock.dbEstablishmentSubscription.updateMany.mockResolvedValue({ count: 1 });
      dbMock.dbEstablishmentSubscription.upsert.mockResolvedValue({ id: 'sub-1', establishmentId });

      await repository.upsert(
        establishmentId,
        { stripeCustomerId: 'cus_shared' } as any,
        {
          stripeCustomerId: 'cus_shared',
        } as any,
      );

      expect(dbMock.dbEstablishmentSubscription.updateMany).toHaveBeenCalledWith({
        where: { stripeCustomerId: 'cus_shared', establishmentId: { not: establishmentId } },
        data: { stripeCustomerId: null },
      });
      expect(dbMock.dbEstablishmentSubscription.upsert).toHaveBeenCalled();
    });

    it('should name the establishment that lost its billing link so the incident is traceable', async () => {
      const establishmentId = asEstablishmentId('establishment-123');
      const error = vi.spyOn(Logger.prototype, 'error').mockReturnValue(undefined);
      dbMock.dbEstablishmentSubscription.findMany.mockResolvedValue([{ establishmentId: 'establishment-other' }]);
      dbMock.dbEstablishmentSubscription.updateMany.mockResolvedValue({ count: 1 });
      dbMock.dbEstablishmentSubscription.upsert.mockResolvedValue({ id: 'sub-1', establishmentId });

      await repository.upsert(establishmentId, { stripeCustomerId: 'cus_shared' } as any, {} as any);

      const message = error.mock.calls.at(-1)?.[0] as string;
      expect(message).toContain('cus_shared');
      expect(message).toContain('establishment-other');
      expect(message).toContain('establishment-123');
    });

    it('should leave other rows alone when nobody else holds the id', async () => {
      const establishmentId = asEstablishmentId('establishment-123');
      dbMock.dbEstablishmentSubscription.findMany.mockResolvedValue([]);
      dbMock.dbEstablishmentSubscription.upsert.mockResolvedValue({ id: 'sub-1', establishmentId });

      await repository.upsert(establishmentId, { stripeCustomerId: 'cus_free' } as any, {} as any);

      expect(dbMock.dbEstablishmentSubscription.updateMany).not.toHaveBeenCalled();
      expect(dbMock.dbEstablishmentSubscription.upsert).toHaveBeenCalled();
    });

    it('should release a Stripe subscription still linked to another establishment before writing', async () => {
      const establishmentId = asEstablishmentId('establishment-123');
      dbMock.dbEstablishmentSubscription.findMany.mockResolvedValue([{ establishmentId: 'establishment-other' }]);
      dbMock.dbEstablishmentSubscription.updateMany.mockResolvedValue({ count: 1 });
      dbMock.dbEstablishmentSubscription.upsert.mockResolvedValue({ id: 'sub-1', establishmentId });

      await repository.upsert(
        establishmentId,
        { stripeSubscriptionId: 'sub_shared' } as any,
        {
          stripeSubscriptionId: 'sub_shared',
        } as any,
      );

      expect(dbMock.dbEstablishmentSubscription.updateMany).toHaveBeenCalledWith({
        where: { stripeSubscriptionId: 'sub_shared', establishmentId: { not: establishmentId } },
        data: { stripeSubscriptionId: null },
      });
    });

    it('should not release anything when the subscription id is being cleared', async () => {
      const establishmentId = asEstablishmentId('establishment-123');
      dbMock.dbEstablishmentSubscription.upsert.mockResolvedValue({ id: 'sub-1', establishmentId });

      await repository.upsert(
        establishmentId,
        { stripeSubscriptionId: null } as any,
        {
          stripeSubscriptionId: null,
        } as any,
      );

      expect(dbMock.dbEstablishmentSubscription.updateMany).not.toHaveBeenCalled();
    });
  });
});
