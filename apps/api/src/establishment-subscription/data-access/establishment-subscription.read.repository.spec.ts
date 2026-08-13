import { asEstablishmentId } from '@coaster/common';
import type { DbService } from '@coaster/core/db';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { EstablishmentSubscriptionReadRepository } from './establishment-subscription.read.repository';

describe('EstablishmentSubscriptionReadRepository', () => {
  let repository: EstablishmentSubscriptionReadRepository;
  let dbMock: { dbEstablishmentSubscription: { findUnique: ReturnType<typeof vi.fn> } };

  beforeEach(() => {
    dbMock = {
      dbEstablishmentSubscription: {
        findUnique: vi.fn(),
      },
    };
    repository = new EstablishmentSubscriptionReadRepository(dbMock as unknown as DbService);
  });

  it('should find subscription by establishmentId', async () => {
    const establishmentId = asEstablishmentId('establishment-123');
    dbMock.dbEstablishmentSubscription.findUnique.mockResolvedValue({ id: 'sub-1', establishmentId });

    const result = await repository.findByEstablishmentId(establishmentId);

    expect(dbMock.dbEstablishmentSubscription.findUnique).toHaveBeenCalledWith({
      where: { establishmentId },
    });
    expect(result).toEqual({ id: 'sub-1', establishmentId });
  });

  it('should find subscription by stripeCustomerId', async () => {
    const customerId = 'cus_123';
    dbMock.dbEstablishmentSubscription.findUnique.mockResolvedValue({ id: 'sub-1', stripeCustomerId: customerId });

    const result = await repository.findByStripeCustomerId(customerId);

    expect(dbMock.dbEstablishmentSubscription.findUnique).toHaveBeenCalledWith({
      where: { stripeCustomerId: customerId },
    });
    expect(result).toEqual({ id: 'sub-1', stripeCustomerId: customerId });
  });

  it('should find subscription by stripeSubscriptionId', async () => {
    const subscriptionId = 'sub_123';
    dbMock.dbEstablishmentSubscription.findUnique.mockResolvedValue({
      id: 'sub-1',
      stripeSubscriptionId: subscriptionId,
    });

    const result = await repository.findByStripeSubscriptionId(subscriptionId);

    expect(dbMock.dbEstablishmentSubscription.findUnique).toHaveBeenCalledWith({
      where: { stripeSubscriptionId: subscriptionId },
    });
    expect(result).toEqual({ id: 'sub-1', stripeSubscriptionId: subscriptionId });
  });
});
