import { Injectable, Logger, OnApplicationShutdown } from '@nestjs/common';
import { ThrottlerStorage, ThrottlerStorageService } from '@nestjs/throttler';
import { CacheClient, CacheConnection } from './cache.connection';

type ThrottlerStorageRecord = Awaited<ReturnType<ThrottlerStorage['increment']>>;

const COUNT_HIT = `
local hits = redis.call('INCR', KEYS[1])

if hits == 1 then
  redis.call('PEXPIRE', KEYS[1], ARGV[1])
end

if hits == tonumber(ARGV[2]) + 1 then
  redis.call('PEXPIRE', KEYS[1], ARGV[3])
end

return { hits, redis.call('PTTL', KEYS[1]) }
`;

interface CountsHits {
  countHit(key: string, ttl: number, limit: number, blockDuration: number): Promise<[number, number]>;
}

@Injectable()
export class ThrottlerCacheStorage implements ThrottlerStorage, OnApplicationShutdown {
  readonly #logger = new Logger(ThrottlerCacheStorage.name);
  readonly #inMemory = new ThrottlerStorageService();
  readonly #client: (CacheClient & CountsHits) | null;

  constructor(connection: CacheConnection) {
    this.#client = connection.client as (CacheClient & CountsHits) | null;
    this.#client?.defineCommand('countHit', { numberOfKeys: 1, lua: COUNT_HIT });
  }

  async increment(
    key: string,
    ttl: number,
    limit: number,
    blockDuration: number,
    throttlerName: string,
  ): Promise<ThrottlerStorageRecord> {
    if (!this.#client) {
      return this.#inMemory.increment(key, ttl, limit, blockDuration, throttlerName);
    }

    try {
      const [totalHits, remaining] = await this.#client.countHit(
        `throttle:${throttlerName}:${key}`,
        ttl,
        limit,
        blockDuration,
      );
      const timeToExpire = Math.ceil(remaining / 1000);

      return { totalHits, timeToExpire, isBlocked: totalHits > limit, timeToBlockExpire: timeToExpire };
    } catch (error) {
      this.#logger.debug(`Counting requests in memory instead: ${(error as Error).message}`);
      return this.#inMemory.increment(key, ttl, limit, blockDuration, throttlerName);
    }
  }

  onApplicationShutdown() {
    this.#inMemory.onApplicationShutdown();
  }
}
