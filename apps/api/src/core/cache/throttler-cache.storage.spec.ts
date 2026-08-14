import { Logger } from '@nestjs/common';
import { seconds } from '@nestjs/throttler';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CacheConnection } from './cache.connection';
import { ThrottlerCacheStorage } from './throttler-cache.storage';

const TTL = seconds(60);
const LIMIT = 300;

describe('ThrottlerCacheStorage', () => {
  let client: { defineCommand: ReturnType<typeof vi.fn>; countHit: ReturnType<typeof vi.fn> };

  const build = (connection: Partial<CacheConnection>) => new ThrottlerCacheStorage(connection as CacheConnection);

  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(Logger.prototype, 'debug').mockReturnValue(undefined);

    client = { defineCommand: vi.fn(), countHit: vi.fn() };
  });

  it('should count in the shared cache, keyed by throttler so two limits do not share a bucket', async () => {
    client.countHit.mockResolvedValue([5, 42_000]);
    const storage = build({ client: client as never });

    await expect(storage.increment('tracker-hash', TTL, LIMIT, TTL, 'default')).resolves.toEqual({
      totalHits: 5,
      timeToExpire: 42,
      isBlocked: false,
      timeToBlockExpire: 42,
    });

    expect(client.countHit).toHaveBeenCalledWith('throttle:default:tracker-hash', TTL, LIMIT, TTL);
  });

  it('should block once the hits go past the limit', async () => {
    client.countHit.mockResolvedValue([LIMIT + 1, 30_000]);
    const storage = build({ client: client as never });

    await expect(storage.increment('tracker-hash', TTL, LIMIT, TTL, 'default')).resolves.toMatchObject({
      isBlocked: true,
    });
  });

  it('should count in memory when there is no cache configured', async () => {
    const storage = build({ client: null });

    await expect(storage.increment('tracker-hash', TTL, LIMIT, TTL, 'default')).resolves.toMatchObject({
      totalHits: 1,
      isBlocked: false,
    });

    storage.onApplicationShutdown();
  });

  it('should fall back to counting in memory rather than answering 500 when the cache is down', async () => {
    client.countHit.mockRejectedValue(new Error('connection refused'));
    const storage = build({ client: client as never });

    await expect(storage.increment('tracker-hash', TTL, LIMIT, TTL, 'default')).resolves.toMatchObject({
      totalHits: 1,
      isBlocked: false,
    });

    storage.onApplicationShutdown();
  });
});
