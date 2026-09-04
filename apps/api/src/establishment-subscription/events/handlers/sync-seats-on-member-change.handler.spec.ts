import type { EstablishmentId, EstablishmentMemberId, UserId } from '@coaster/common';
import { MemberRemovedEvent } from '@coaster/establishment-members';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SyncSubscriptionSeatsCommand } from '../../commands/impl/sync-subscription-seats.command';
import { SyncSeatsOnMemberChangeHandler } from './sync-seats-on-member-change.handler';

describe('SyncSeatsOnMemberChangeHandler (establishment-subscription)', () => {
  let handler: SyncSeatsOnMemberChangeHandler;
  let commandBusMock: any;

  const event = new MemberRemovedEvent(
    'establishment_123' as EstablishmentId,
    'member_1' as EstablishmentMemberId,
    'user_1' as UserId,
  );

  beforeEach(() => {
    commandBusMock = { execute: vi.fn().mockResolvedValue(undefined) };
    handler = new SyncSeatsOnMemberChangeHandler(commandBusMock);
  });

  it('should ask for the seats to be recounted for the establishment that changed', async () => {
    await handler.handle(event);

    expect(commandBusMock.execute).toHaveBeenCalledWith(new SyncSubscriptionSeatsCommand(event.establishmentId));
  });

  it('should swallow a Stripe failure, since the member was already added or removed', async () => {
    commandBusMock.execute.mockRejectedValue(new Error('Stripe unavailable'));

    await expect(handler.handle(event)).resolves.toBeUndefined();
  });
});
