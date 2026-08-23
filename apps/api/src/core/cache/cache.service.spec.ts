import { Logger } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CACHE_TTL_SECONDS } from './cache-keys';
import { CacheConnection } from './cache.connection';
import { CacheService } from './cache.service';

describe('CacheService', () => {
  let client: { get: ReturnType<typeof vi.fn>; set: ReturnType<typeof vi.fn>; del: ReturnType<typeof vi.fn> };
  let service: CacheService;

  const build = (connection: Partial<CacheConnection>) => new CacheService(connection as CacheConnection);

  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(Logger.prototype, 'warn').mockReturnValue(undefined);
    vi.spyOn(Logger.prototype, 'debug').mockReturnValue(undefined);

    client = { get: vi.fn(), set: vi.fn(), del: vi.fn() };
    service = build({ client: client as never });
  });

  it('should ask the loader on a miss and store what it answered', async () => {
    client.get.mockResolvedValue(null);
    const load = vi.fn().mockResolvedValue({ role: 'MANAGER' });

    await expect(service.remember('member:1', load)).resolves.toEqual({ role: 'MANAGER' });

    expect(load).toHaveBeenCalledOnce();
    expect(client.set).toHaveBeenCalledWith('member:1', '{"v":{"role":"MANAGER"}}', 'EX', CACHE_TTL_SECONDS);
  });

  it('should answer from the cache without touching the loader', async () => {
    client.get.mockResolvedValue('{"v":{"role":"MANAGER"}}');
    const load = vi.fn();

    await expect(service.remember('member:1', load)).resolves.toEqual({ role: 'MANAGER' });

    expect(load).not.toHaveBeenCalled();
  });

  it('should tell a cached null apart from a miss, so a non-member stays cheap', async () => {
    client.get.mockResolvedValue('{"v":null}');
    const load = vi.fn();

    await expect(service.remember('member:1', load)).resolves.toBeNull();

    expect(load).not.toHaveBeenCalled();
  });

  it('should round-trip an undefined, which is what a missing user role looks like', async () => {
    client.get.mockResolvedValue(null);
    const load = vi.fn().mockResolvedValue(undefined);

    await expect(service.remember('role:1', load)).resolves.toBeUndefined();
    expect(client.set).toHaveBeenCalledWith('role:1', '{}', 'EX', CACHE_TTL_SECONDS);

    client.get.mockResolvedValue('{}');
    const second = vi.fn();

    await expect(service.remember('role:1', second)).resolves.toBeUndefined();
    expect(second).not.toHaveBeenCalled();
  });

  it('should revive dates, or the subscription guard would compare against a string', async () => {
    client.get.mockResolvedValue('{"v":{"currentPeriodEnd":"2026-08-14T10:00:00.000Z"}}');

    const cached = await service.remember<{ currentPeriodEnd: Date }>('subscription:1', vi.fn());

    expect(cached.currentPeriodEnd).toBeInstanceOf(Date);
    expect(cached.currentPeriodEnd.toISOString()).toBe('2026-08-14T10:00:00.000Z');
  });

  it('should fall through to the loader when reading blows up', async () => {
    client.get.mockRejectedValue(new Error('connection refused'));
    const load = vi.fn().mockResolvedValue('from-postgres');

    await expect(service.remember('role:1', load)).resolves.toBe('from-postgres');
    expect(load).toHaveBeenCalledOnce();
  });

  it('should still answer when writing blows up', async () => {
    client.get.mockResolvedValue(null);
    client.set.mockRejectedValue(new Error('connection refused'));
    const load = vi.fn().mockResolvedValue('from-postgres');

    await expect(service.remember('role:1', load)).resolves.toBe('from-postgres');
  });

  it('should go straight to the loader when there is no cache configured', async () => {
    const withoutCache = build({ client: null });
    const load = vi.fn().mockResolvedValue('from-postgres');

    await expect(withoutCache.remember('role:1', load)).resolves.toBe('from-postgres');
    expect(client.get).not.toHaveBeenCalled();
  });

  it('should drop keys and swallow a failure to drop them', async () => {
    await service.forget('a', 'b');
    expect(client.del).toHaveBeenCalledWith('a', 'b');

    client.del.mockRejectedValue(new Error('connection refused'));
    await expect(service.forget('a')).resolves.toBeUndefined();
  });

  it('should not call the cache to drop nothing', async () => {
    await service.forget();

    expect(client.del).not.toHaveBeenCalled();
  });
});
