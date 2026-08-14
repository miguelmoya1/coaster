import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { Redis, RedisOptions } from 'ioredis';

export type CacheClient = Redis;

@Injectable()
export class CacheConnection implements OnModuleDestroy {
  readonly #logger = new Logger(CacheConnection.name);
  readonly #connections: CacheClient[] = [];
  readonly #failing = new Set<string>();

  readonly client: CacheClient | null;

  constructor() {
    this.client = this.open('cache', { enableOfflineQueue: false, maxRetriesPerRequest: 1 });

    if (!this.client) {
      this.#logger.warn('REDIS_URL is unset: nothing is cached and rooms live in this process only');
    }
  }

  get enabled(): boolean {
    return this.client !== null;
  }

  open(name: string, options: RedisOptions = {}): CacheClient | null {
    const url = process.env.REDIS_URL;

    if (!url) {
      return null;
    }

    const connection = new Redis(url, { connectionName: `coaster-${name}`, ...options });

    connection.on('error', (error: Error) => {
      if (!this.#failing.has(name)) {
        this.#failing.add(name);
        this.#logger.warn(`Cache connection "${name}" is down, falling back: ${error.message}`);
      }
    });

    connection.on('ready', () => {
      if (this.#failing.delete(name)) {
        this.#logger.log(`Cache connection "${name}" is back`);
      }
    });

    this.#connections.push(connection);

    return connection;
  }

  async onModuleDestroy() {
    await Promise.all(
      this.#connections.map((connection) => connection.quit().catch(() => connection.disconnect())),
    );
  }
}
