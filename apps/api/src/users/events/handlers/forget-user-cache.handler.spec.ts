import { CacheService } from '@coaster/core';
import { asUserId } from '@coaster/common';
import { Logger } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { UserUpdatedEvent } from '../impl/user-updated.event';
import { ForgetUserCacheHandler } from './forget-user-cache.handler';

describe('ForgetUserCacheHandler', () => {
  const cache = { forget: vi.fn(), remember: vi.fn() };
  let handler: ForgetUserCacheHandler;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(Logger.prototype, 'debug').mockReturnValue(undefined);

    handler = new ForgetUserCacheHandler(cache as unknown as CacheService);
  });

  it('should drop both the role and the record the token lookup reads', async () => {
    await handler.handle(new UserUpdatedEvent(asUserId('user-1'), 'google-1'));

    expect(cache.forget).toHaveBeenCalledWith('user:user-1:role', 'user:google:google-1');
  });

  it('should drop only the role when the account has no sign-in linked yet', async () => {
    await handler.handle(new UserUpdatedEvent(asUserId('user-1'), null));

    expect(cache.forget).toHaveBeenCalledWith('user:user-1:role');
  });
});
