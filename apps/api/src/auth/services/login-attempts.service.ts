import { CacheClient, CacheConnection } from '@coaster/core';
import { Injectable, Logger } from '@nestjs/common';
import { createHash } from 'node:crypto';

export const LOGIN_FAILURE_LIMIT = 10;

export const LOGIN_FAILURE_WINDOW_SECONDS = 15 * 60;

export const LOGIN_LOCK_SECONDS = 15 * 60;

const MEMORY_HIGH_WATER_MARK = 10_000;

const COUNT_FAILURE = `
local failures = redis.call('INCR', KEYS[1])

if failures == 1 then
  redis.call('EXPIRE', KEYS[1], ARGV[1])
end

if failures >= tonumber(ARGV[2]) then
  redis.call('EXPIRE', KEYS[1], ARGV[3])
end

return { failures, redis.call('TTL', KEYS[1]) }
`;

const READ_FAILURES = `
return { tonumber(redis.call('GET', KEYS[1])) or 0, redis.call('TTL', KEYS[1]) }
`;

interface CountsFailures {
  countLoginFailure(key: string, window: number, limit: number, lock: number): Promise<[number, number]>;
  readLoginFailures(key: string): Promise<[number, number]>;
}

interface Run {
  failures: number;
  expiresAt: number;
}

@Injectable()
export class LoginAttemptsService {
  readonly #logger = new Logger(LoginAttemptsService.name);
  readonly #memory = new Map<string, Run>();
  readonly #client: (CacheClient & CountsFailures) | null;

  constructor(connection: CacheConnection) {
    this.#client = connection.client as (CacheClient & CountsFailures) | null;
    this.#client?.defineCommand('countLoginFailure', { numberOfKeys: 1, lua: COUNT_FAILURE });
    this.#client?.defineCommand('readLoginFailures', { numberOfKeys: 1, lua: READ_FAILURES });
  }

  public async lockedFor(email: string): Promise<number> {
    const key = this.#keyOf(email);

    if (this.#client) {
      try {
        return this.#waitOf(await this.#client.readLoginFailures(key));
      } catch (error) {
        this.#logger.debug(`Counting attempts in memory instead: ${(error as Error).message}`);
      }
    }

    const run = this.#runOf(key);

    return run ? this.#waitOf([run.failures, Math.ceil((run.expiresAt - Date.now()) / 1000)]) : 0;
  }

  public async remember(email: string): Promise<void> {
    const key = this.#keyOf(email);

    if (this.#client) {
      try {
        await this.#client.countLoginFailure(
          key,
          LOGIN_FAILURE_WINDOW_SECONDS,
          LOGIN_FAILURE_LIMIT,
          LOGIN_LOCK_SECONDS,
        );

        return;
      } catch (error) {
        this.#logger.debug(`Counting attempts in memory instead: ${(error as Error).message}`);
      }
    }

    const failures = (this.#runOf(key)?.failures ?? 0) + 1;
    const lasts = failures >= LOGIN_FAILURE_LIMIT ? LOGIN_LOCK_SECONDS : LOGIN_FAILURE_WINDOW_SECONDS;

    this.#sweep();
    this.#memory.set(key, { failures, expiresAt: Date.now() + lasts * 1000 });
  }

  public async forget(email: string): Promise<void> {
    const key = this.#keyOf(email);

    this.#memory.delete(key);

    if (!this.#client) {
      return;
    }

    try {
      await this.#client.del(key);
    } catch (error) {
      this.#logger.debug(`Could not clear ${key}: ${(error as Error).message}`);
    }
  }

  #keyOf(email: string): string {
    return `auth:login-failures:${createHash('sha256').update(email.trim().toLowerCase()).digest('hex')}`;
  }

  #waitOf([failures, ttl]: [number, number]): number {
    return failures >= LOGIN_FAILURE_LIMIT ? Math.max(ttl, 1) : 0;
  }

  #runOf(key: string): Run | null {
    const run = this.#memory.get(key);

    if (!run) {
      return null;
    }

    if (run.expiresAt <= Date.now()) {
      this.#memory.delete(key);

      return null;
    }

    return run;
  }

  #sweep(): void {
    if (this.#memory.size < MEMORY_HIGH_WATER_MARK) {
      return;
    }

    const now = Date.now();

    for (const [key, run] of this.#memory) {
      if (run.expiresAt <= now) {
        this.#memory.delete(key);
      }
    }
  }
}
