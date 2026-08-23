import { Injectable, Logger } from '@nestjs/common';
import { CacheConnection } from './cache.connection';
import { CACHE_TTL_SECONDS } from './cache-keys';

const ISO_DATE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z$/;

interface Envelope<T> {
  v: T;
}

function reviveDates(_key: string, value: unknown): unknown {
  return typeof value === 'string' && ISO_DATE.test(value) ? new Date(value) : value;
}

@Injectable()
export class CacheService {
  readonly #logger = new Logger(CacheService.name);

  constructor(private readonly _connection: CacheConnection) {}

  async remember<T>(key: string, load: () => Promise<T>): Promise<T> {
    const cached = await this.#read<T>(key);

    if (cached) {
      return cached.v;
    }

    const value = await load();
    await this.#write(key, value);

    return value;
  }

  async forget(...keys: string[]): Promise<void> {
    const client = this._connection.client;

    if (!client || keys.length === 0) {
      return;
    }

    try {
      await client.del(...keys);
    } catch (error) {
      this.#logger.warn(`Could not drop ${keys.join(', ')}: ${(error as Error).message}`);
    }
  }

  async #read<T>(key: string): Promise<Envelope<T> | null> {
    const client = this._connection.client;

    if (!client) {
      return null;
    }

    try {
      const raw = await client.get(key);

      return raw === null ? null : (JSON.parse(raw, reviveDates) as Envelope<T>);
    } catch (error) {
      this.#logger.debug(`Reading ${key} from the database instead: ${(error as Error).message}`);
      return null;
    }
  }

  async #write<T>(key: string, value: T): Promise<void> {
    const client = this._connection.client;

    if (!client) {
      return;
    }

    try {
      await client.set(key, JSON.stringify({ v: value }), 'EX', CACHE_TTL_SECONDS);
    } catch (error) {
      this.#logger.debug(`Could not store ${key}: ${(error as Error).message}`);
    }
  }
}
