import { SubscriptionPlan, SubscriptionStatus, asEstablishmentId } from '@coaster/common';
import { Test, TestingModule } from '@nestjs/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { EstablishmentSubscriptionReadRepository } from '../../data-access/establishment-subscription.read.repository';
import { FindEstablishmentSubscriptionQuery } from '../impl/find-establishment-subscription.query';
import { FindEstablishmentSubscriptionHandler } from './find-establishment-subscription.handler';

describe('FindEstablishmentSubscriptionHandler', () => {
  let handler: FindEstablishmentSubscriptionHandler;
  const readRepo = {
    findByEstablishmentId: vi.fn(),
  };

  beforeEach(async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-15T00:00:00.000Z'));

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FindEstablishmentSubscriptionHandler,
        { provide: EstablishmentSubscriptionReadRepository, useValue: readRepo },
      ],
    }).compile();

    handler = module.get<FindEstablishmentSubscriptionHandler>(FindEstablishmentSubscriptionHandler);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should return subscription domain object when found', async () => {
    const establishmentId = asEstablishmentId('establishment-123');
    readRepo.findByEstablishmentId.mockResolvedValue({
      id: 'sub-1',
      establishmentId: 'establishment-123',
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

    const result = await handler.execute(new FindEstablishmentSubscriptionQuery(establishmentId));

    expect(readRepo.findByEstablishmentId).toHaveBeenCalledWith(establishmentId);
    expect(result).toEqual({
      id: 'sub-1',
      establishmentId: 'establishment-123',
      plan: SubscriptionPlan.PRO,
      status: SubscriptionStatus.ACTIVE,
      stripeCustomerId: 'cus_123',
      stripeSubscriptionId: 'sub_123',
      currentPeriodStart: new Date('2026-01-01').toISOString(),
      currentPeriodEnd: new Date('2026-02-01').toISOString(),
      trialEndsAt: null,
      canceledAt: null,
      manualGrant: null,
      createdAt: new Date('2026-01-01').toISOString(),
      updatedAt: new Date('2026-01-01').toISOString(),
    });
  });

  it('should return a default FREE/INACTIVE subscription when the establishment has none', async () => {
    const establishmentId = asEstablishmentId('establishment-999');
    readRepo.findByEstablishmentId.mockResolvedValue(null);

    const result = await handler.execute(new FindEstablishmentSubscriptionQuery(establishmentId));

    expect(readRepo.findByEstablishmentId).toHaveBeenCalledWith(establishmentId);
    expect(result).toEqual(
      expect.objectContaining({
        establishmentId,
        plan: SubscriptionPlan.FREE,
        status: SubscriptionStatus.INACTIVE,
        stripeCustomerId: null,
        stripeSubscriptionId: null,
        currentPeriodEnd: null,
      }),
    );
  });

  it('should report a lapsed period as EXPIRED without waiting for a webhook', async () => {
    const establishmentId = asEstablishmentId('establishment-123');
    readRepo.findByEstablishmentId.mockResolvedValue({
      id: 'sub-1',
      establishmentId: 'establishment-123',
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

    const result = await handler.execute(new FindEstablishmentSubscriptionQuery(establishmentId));

    expect(result.status).toBe(SubscriptionStatus.EXPIRED);
  });
});
