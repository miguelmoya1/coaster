import type { CacheService } from '../../src/core/cache/cache.service';

export const passThroughCache = {
  remember: <T>(_key: string, load: () => Promise<T>) => load(),
  forget: () => Promise.resolve(),
} as unknown as CacheService;
