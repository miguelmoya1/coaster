import { CacheService } from '@coaster/core';
import {
  asEstablishmentId,
  asEstablishmentMemberId,
  asUserId,
  EstablishmentRole,
  Role,
} from '@coaster/common';
import { Logger } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MemberInvitedEvent } from '../impl/member-invited.event';
import { MemberRemovedEvent } from '../impl/member-removed.event';
import { MemberRoleChangedEvent } from '../impl/member-role-changed.event';
import { ForgetMemberCacheHandler } from './forget-member-cache.handler';

describe('ForgetMemberCacheHandler', () => {
  const cache = { forget: vi.fn(), remember: vi.fn() };
  let handler: ForgetMemberCacheHandler;

  const establishmentId = asEstablishmentId('establishment-1');
  const userId = asUserId('user-1');
  const memberId = asEstablishmentMemberId('member-1');
  const key = 'establishment:establishment-1:member:user-1';

  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(Logger.prototype, 'debug').mockReturnValue(undefined);

    handler = new ForgetMemberCacheHandler(cache as unknown as CacheService);
  });

  it('should drop the membership when a role changes', async () => {
    await handler.handle(
      new MemberRoleChangedEvent(
        establishmentId,
        memberId,
        userId,
        EstablishmentRole.STAFF,
        EstablishmentRole.MANAGER,
        asUserId('actor-1'),
        Role.USER,
      ),
    );

    expect(cache.forget).toHaveBeenCalledWith(key);
  });

  it('should drop the membership when a member is removed', async () => {
    await handler.handle(new MemberRemovedEvent(establishmentId, memberId, userId));

    expect(cache.forget).toHaveBeenCalledWith(key);
  });

  it('should drop the membership on an invite, or the cached "not a member" would outlive it', async () => {
    await handler.handle(
      new MemberInvitedEvent(establishmentId, memberId, 'new@test.com', 'Test', 'Inviter', 'es', userId),
    );

    expect(cache.forget).toHaveBeenCalledWith(key);
  });
});
