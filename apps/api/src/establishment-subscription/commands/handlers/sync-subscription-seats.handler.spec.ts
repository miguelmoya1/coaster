import type { EstablishmentId } from '@coaster/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SyncSubscriptionSeatsCommand } from '../impl/sync-subscription-seats.command';
import { SyncSubscriptionSeatsHandler } from './sync-subscription-seats.handler';

describe('SyncSubscriptionSeatsHandler (establishment-subscription)', () => {
  let handler: SyncSubscriptionSeatsHandler;
  let readRepoMock: any;
  let configServiceMock: any;
  let stripeApiMock: any;

  const establishmentId = 'establishment_123' as EstablishmentId;

  beforeEach(() => {
    readRepoMock = {
      findByEstablishmentId: vi.fn().mockResolvedValue({ stripeSubscriptionId: 'sub_1', seats: 7 }),
      countBillableSeats: vi.fn().mockResolvedValue(12),
    };

    configServiceMock = {
      get: vi.fn().mockImplementation((key: string) => (key === 'STRIPE_PRICE_PRO' ? 'price_per_seat' : undefined)),
    };

    stripeApiMock = { updateSubscriptionSeats: vi.fn().mockResolvedValue(true) };

    handler = new SyncSubscriptionSeatsHandler(readRepoMock, configServiceMock, stripeApiMock);
  });

  it('should tell Stripe the new headcount on the price seats are billed at', async () => {
    await handler.execute(new SyncSubscriptionSeatsCommand(establishmentId));

    expect(stripeApiMock.updateSubscriptionSeats).toHaveBeenCalledWith('sub_1', 12, 'price_per_seat');
  });

  it('should stay quiet when the establishment has no subscription to bill', async () => {
    readRepoMock.findByEstablishmentId.mockResolvedValue({ stripeSubscriptionId: null, seats: 1 });

    await handler.execute(new SyncSubscriptionSeatsCommand(establishmentId));

    expect(stripeApiMock.updateSubscriptionSeats).not.toHaveBeenCalled();
  });

  it('should stay quiet when the establishment was never projected at all', async () => {
    readRepoMock.findByEstablishmentId.mockResolvedValue(null);

    await handler.execute(new SyncSubscriptionSeatsCommand(establishmentId));

    expect(stripeApiMock.updateSubscriptionSeats).not.toHaveBeenCalled();
  });

  it('should not spend a Stripe call when the headcount has not moved', async () => {
    readRepoMock.countBillableSeats.mockResolvedValue(7);

    await handler.execute(new SyncSubscriptionSeatsCommand(establishmentId));

    expect(stripeApiMock.updateSubscriptionSeats).not.toHaveBeenCalled();
  });

  it('should leave the subscription untouched when no price is configured to bill seats at', async () => {
    configServiceMock.get.mockReturnValue(undefined);

    await handler.execute(new SyncSubscriptionSeatsCommand(establishmentId));

    expect(stripeApiMock.updateSubscriptionSeats).not.toHaveBeenCalled();
  });
});
