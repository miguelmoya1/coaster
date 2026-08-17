import { RealtimeEvents } from '@coaster/common';
import type { ServerResponse } from 'node:http';
import { afterEach, beforeEach, describe, expect, it, vi, type Mock } from 'vitest';
import { RealtimeStream } from './realtime.stream';

describe('RealtimeStream', () => {
  let response: { write: ReturnType<typeof vi.fn>; end: ReturnType<typeof vi.fn>; on: ReturnType<typeof vi.fn> };
  let onClose: Mock<() => void>;
  let stream: RealtimeStream;

  const closeTheSocket = () => {
    const handler = response.on.mock.calls.find(([event]) => event === 'close')?.[1] as () => void;
    handler();
  };

  beforeEach(() => {
    vi.useFakeTimers();

    response = { write: vi.fn(), end: vi.fn(), on: vi.fn() };
    onClose = vi.fn<() => void>();
    stream = new RealtimeStream('user-1', response as unknown as ServerResponse, onClose);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should flush a comment as soon as it starts, so no proxy holds the headers back', () => {
    stream.start();

    expect(response.write).toHaveBeenCalledWith(': open\n\n');
  });

  it('should write an event as an SSE frame', () => {
    stream.start();
    stream.deliver({ id: '1000', event: RealtimeEvents.orderCreated, payload: { id: 'order-1' } });

    expect(response.write).toHaveBeenCalledWith('id: 1000\nevent: orderCreated\ndata: {"id":"order-1"}\n\n');
  });

  it('should beat every 25 seconds while it is open', () => {
    stream.start();
    response.write.mockClear();

    vi.advanceTimersByTime(25_000);

    expect(response.write).toHaveBeenCalledWith(': ping\n\n');
  });

  it('should close itself after 30 minutes so the client comes back with a fresh token', () => {
    stream.start();

    vi.advanceTimersByTime(30 * 60_000);

    expect(response.end).toHaveBeenCalled();
    expect(onClose).toHaveBeenCalled();
  });

  it('should stop beating once it is closed', () => {
    stream.start();
    stream.close();
    response.write.mockClear();

    vi.advanceTimersByTime(60_000);

    expect(response.write).not.toHaveBeenCalled();
  });

  it('should report a close only once', () => {
    stream.start();

    stream.close();
    closeTheSocket();
    stream.close();

    expect(onClose).toHaveBeenCalledTimes(1);
    expect(response.end).toHaveBeenCalledTimes(1);
  });

  it('should close when the client hangs up', () => {
    stream.start();

    closeTheSocket();

    expect(onClose).toHaveBeenCalled();
  });

  it('should close instead of throwing when the socket refuses a write', () => {
    stream.start();
    response.write.mockImplementation(() => {
      throw new Error('write after end');
    });

    expect(() => stream.deliver({ id: '1000', event: RealtimeEvents.orderCreated, payload: { id: 'order-1' } })).not.toThrow();
    expect(onClose).toHaveBeenCalled();
  });
});
