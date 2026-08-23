import { Logger } from '@nestjs/common';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CacheConnection } from './cache.connection';

describe('CacheConnection', () => {
  const original = process.env.REDIS_URL;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(Logger.prototype, 'warn').mockReturnValue(undefined);
    vi.spyOn(Logger.prototype, 'error').mockReturnValue(undefined);
  });

  afterEach(async () => {
    process.env.REDIS_URL = original;
  });

  it('should run without a cache when REDIS_URL is unset', () => {
    delete process.env.REDIS_URL;

    const connection = new CacheConnection();

    expect(connection.client).toBeNull();
    expect(connection.enabled).toBe(false);
  });

  it('should carry on without a cache rather than refuse to boot on an unusable REDIS_URL', () => {
    process.env.REDIS_URL = 'rediss://user:pass@';

    const connection = new CacheConnection();

    expect(connection.client).toBeNull();
    expect(connection.enabled).toBe(false);
  });

  it('should open a client for an address it cannot reach, and not throw doing it', async () => {
    process.env.REDIS_URL = 'redis://127.0.0.1:6399';

    const connection = new CacheConnection();

    expect(connection.enabled).toBe(true);

    await connection.onModuleDestroy();
  });
});
