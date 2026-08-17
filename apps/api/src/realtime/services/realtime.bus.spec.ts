import { RealtimeEvents } from '@coaster/common';
import { CacheConnection } from '@coaster/core';
import { Logger } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { RealtimeBus } from './realtime.bus';
import { RealtimeRegistry } from './realtime.registry';

const CHANNEL = 'coaster:realtime';
const frame = { id: '1000', event: RealtimeEvents.orderCreated, payload: { id: 'order-1' } };

describe('RealtimeBus', () => {
  let pipeline: {
    zadd: ReturnType<typeof vi.fn>;
    zremrangebyscore: ReturnType<typeof vi.fn>;
    pexpire: ReturnType<typeof vi.fn>;
    exec: ReturnType<typeof vi.fn>;
  };
  let publisher: {
    publish: ReturnType<typeof vi.fn>;
    pipeline: ReturnType<typeof vi.fn>;
    zrangebyscore: ReturnType<typeof vi.fn>;
  };
  let subscriber: { on: ReturnType<typeof vi.fn>; subscribe: ReturnType<typeof vi.fn> };
  let connection: { client: unknown; open: ReturnType<typeof vi.fn> };
  let registry: { deliver: ReturnType<typeof vi.fn>; revoke: ReturnType<typeof vi.fn> };
  let bus: RealtimeBus;

  const receive = (message: unknown) => {
    const handler = subscriber.on.mock.calls.find(([event]) => event === 'message')?.[1] as (
      channel: string,
      raw: string,
    ) => void;

    handler(CHANNEL, typeof message === 'string' ? message : JSON.stringify(message));
  };

  const publishedMessage = () => JSON.parse(publisher.publish.mock.calls[0][1] as string) as { origin: string };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(Logger.prototype, 'warn').mockReturnValue(undefined);
    vi.spyOn(Logger.prototype, 'log').mockReturnValue(undefined);

    pipeline = {
      zadd: vi.fn().mockReturnThis(),
      zremrangebyscore: vi.fn().mockReturnThis(),
      pexpire: vi.fn().mockReturnThis(),
      exec: vi.fn().mockResolvedValue([]),
    };
    publisher = {
      publish: vi.fn().mockResolvedValue(1),
      pipeline: vi.fn().mockReturnValue(pipeline),
      zrangebyscore: vi.fn().mockResolvedValue([]),
    };
    subscriber = { on: vi.fn(), subscribe: vi.fn().mockResolvedValue('OK') };
    connection = { client: publisher, open: vi.fn().mockReturnValue(subscriber) };
    registry = { deliver: vi.fn(), revoke: vi.fn() };

    bus = new RealtimeBus(
      connection as unknown as CacheConnection,
      registry as unknown as RealtimeRegistry,
    );
  });

  it('should open a subscriber of its own and listen on the shared channel', () => {
    bus.onModuleInit();

    expect(connection.open).toHaveBeenCalledWith('realtime-sub');
    expect(subscriber.subscribe).toHaveBeenCalledWith(CHANNEL);
  });

  it('should deliver an event that came from another instance', () => {
    bus.onModuleInit();

    receive({ origin: 'another-instance', kind: 'event', establishmentId: 'establishment-1', frame });

    expect(registry.deliver).toHaveBeenCalledWith('establishment-1', frame);
  });

  it('should ignore what it published itself, so nobody sees an event twice', () => {
    bus.onModuleInit();
    bus.publishEvent('establishment-1', frame);

    receive({ origin: publishedMessage().origin, kind: 'event', establishmentId: 'establishment-1', frame });

    expect(registry.deliver).not.toHaveBeenCalled();
  });

  it('should revoke a user when another instance says so', () => {
    bus.onModuleInit();

    receive({ origin: 'another-instance', kind: 'revoke', establishmentId: 'establishment-1', userId: 'user-1' });

    expect(registry.revoke).toHaveBeenCalledWith('establishment-1', 'user-1');
  });

  it('should discard an unreadable message instead of throwing', () => {
    bus.onModuleInit();

    expect(() => receive('not json')).not.toThrow();
    expect(registry.deliver).not.toHaveBeenCalled();
  });

  it('should keep working locally when there is no cache configured', () => {
    connection.open = vi.fn().mockReturnValue(null);
    connection.client = null;

    bus.onModuleInit();

    expect(() => bus.publishEvent('establishment-1', frame)).not.toThrow();
  });

  it('should swallow a rejected publish, which would otherwise take the process down', async () => {
    publisher.publish.mockRejectedValue(new Error('OOM command not allowed when used memory > maxmemory'));

    bus.onModuleInit();
    bus.publishEvent('establishment-1', frame);

    await expect(Promise.resolve()).resolves.toBeUndefined();
    expect(publisher.publish).toHaveBeenCalled();
  });

  it('should swallow a rejected subscribe and stay local', async () => {
    subscriber.subscribe.mockRejectedValue(new Error('NOPERM'));

    expect(() => bus.onModuleInit()).not.toThrow();
    await expect(Promise.resolve()).resolves.toBeUndefined();
  });

  it('should keep a published event in the replay buffer, bounded and expiring', () => {
    bus.onModuleInit();
    bus.remember('establishment-1', frame);

    expect(pipeline.zadd).toHaveBeenCalledWith('realtime:establishment-1:replay', 1000, JSON.stringify(frame));
    expect(pipeline.zremrangebyscore).toHaveBeenCalledWith('realtime:establishment-1:replay', '-inf', 1000 - 120_000);
    expect(pipeline.pexpire).toHaveBeenCalledWith('realtime:establishment-1:replay', 120_000);
  });

  it('should hand back what the client missed, its own last event included', async () => {
    const missed = { id: '1200', event: RealtimeEvents.orderUpdated, payload: { id: 'order-2' } };
    publisher.zrangebyscore.mockResolvedValue([JSON.stringify(frame), JSON.stringify(missed)]);

    bus.onModuleInit();

    await expect(bus.replay('establishment-1', '1000')).resolves.toEqual([frame, missed]);
    expect(publisher.zrangebyscore).toHaveBeenCalledWith('realtime:establishment-1:replay', '1000', '+inf');
  });

  it('should replay nothing when the client sends an id that is not a number', async () => {
    bus.onModuleInit();

    await expect(bus.replay('establishment-1', 'nonsense')).resolves.toEqual([]);
    expect(publisher.zrangebyscore).not.toHaveBeenCalled();
  });

  it('should replay nothing rather than fail when the buffer refuses', async () => {
    publisher.zrangebyscore.mockRejectedValue(new Error('NOPERM'));

    bus.onModuleInit();

    await expect(bus.replay('establishment-1', '1000')).resolves.toEqual([]);
  });

  it('should replay nothing when there is no cache configured', async () => {
    connection.client = null;

    bus.onModuleInit();

    await expect(bus.replay('establishment-1', '1000')).resolves.toEqual([]);
  });
});
