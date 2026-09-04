import type { EstablishmentId } from '@coaster/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { GetSubscriptionSeatsQuery } from '../impl/get-subscription-seats.query';
import { GetSubscriptionSeatsHandler } from './get-subscription-seats.handler';

describe('GetSubscriptionSeatsHandler (establishment-subscription)', () => {
  let handler: GetSubscriptionSeatsHandler;
  let readRepoMock: any;
  let configServiceMock: any;

  const establishmentId = 'establishment_123' as EstablishmentId;

  beforeEach(() => {
    readRepoMock = {
      countBillableSeats: vi.fn().mockResolvedValue(7),
      findByEstablishmentId: vi.fn().mockResolvedValue({ seats: 5 }),
    };

    configServiceMock = { get: vi.fn().mockReturnValue(undefined) };

    handler = new GetSubscriptionSeatsHandler(readRepoMock, configServiceMock);
  });

  it('should report the staff in the venue apart from the seats Stripe is charging for', async () => {
    const seats = await handler.execute(new GetSubscriptionSeatsQuery(establishmentId));

    expect(seats).toEqual({ used: 7, billed: 5, included: 10, extraPriceCents: 200 });
  });

  it('should report nothing billed for an establishment that never subscribed', async () => {
    readRepoMock.findByEstablishmentId.mockResolvedValue(null);

    const seats = await handler.execute(new GetSubscriptionSeatsQuery(establishmentId));

    expect(seats.billed).toBe(0);
    expect(seats.used).toBe(7);
  });
});
