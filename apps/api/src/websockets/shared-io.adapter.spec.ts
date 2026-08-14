import { CacheConnection } from '@coaster/core';
import { INestApplicationContext, Logger } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SharedIoAdapter } from './shared-io.adapter';

const buildClient = () => ({
  publish: vi.fn().mockResolvedValue(1),
  subscribe: vi.fn().mockResolvedValue('OK'),
  psubscribe: vi.fn().mockResolvedValue('OK'),
  unsubscribe: vi.fn().mockResolvedValue('OK'),
  punsubscribe: vi.fn().mockResolvedValue('OK'),
  on: vi.fn(),
});

describe('SharedIoAdapter', () => {
  let opened: ReturnType<typeof buildClient>[];
  let connection: { open: ReturnType<typeof vi.fn>; client: unknown };
  let app: INestApplicationContext;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(Logger.prototype, 'warn').mockReturnValue(undefined);
    vi.spyOn(Logger.prototype, 'log').mockReturnValue(undefined);

    opened = [buildClient(), buildClient()];
    connection = {
      client: {},
      open: vi.fn((name: string) => (name === 'socket-pub' ? opened[0] : opened[1])),
    };

    app = { get: vi.fn().mockReturnValue(connection as unknown as CacheConnection) } as never;
  });

  it('should open a publisher and a subscriber of its own', () => {
    new SharedIoAdapter(app).connect();

    expect(connection.open).toHaveBeenCalledWith('socket-pub');
    expect(connection.open).toHaveBeenCalledWith('socket-sub');
  });

  it('should keep quiet and stay local when there is no cache configured', () => {
    connection.open = vi.fn().mockReturnValue(null);

    expect(() => new SharedIoAdapter(app).connect()).not.toThrow();
  });

  it.each(['publish', 'subscribe', 'psubscribe', 'unsubscribe', 'punsubscribe'] as const)(
    'should swallow a rejected %s, which would otherwise take the process down',
    async (command) => {
      const raw = opened[0][command];
      raw.mockRejectedValue(new Error('OOM command not allowed when used memory > maxmemory'));

      new SharedIoAdapter(app).connect();

      const publisher = opened[0] as unknown as Record<string, (...args: unknown[]) => Promise<unknown>>;

      await expect(publisher[command]('channel', 'payload')).resolves.toBeUndefined();
      expect(raw).toHaveBeenCalled();
    },
  );

  it('should still hand back what the command answered while the bus is healthy', async () => {
    new SharedIoAdapter(app).connect();

    const publisher = opened[0] as unknown as Record<string, (...args: unknown[]) => Promise<unknown>>;

    await expect(publisher.publish('channel', 'payload')).resolves.toBe(1);
  });
});
