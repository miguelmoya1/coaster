import { provideZonelessChangeDetection, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Auth } from './auth';
import { Socket } from './socket';

const JOIN_BAR_RETRY_MS = 1000;

const handlers = new Map<string, (payload?: unknown) => void>();
const socketMock = {
  connected: false,
  active: false,
  auth: {} as Record<string, unknown>,
  on: vi.fn((event: string, handler: (payload?: unknown) => void) => {
    handlers.set(event, handler);
  }),
  emit: vi.fn(),
  connect: vi.fn(),
  disconnect: vi.fn(),
};

vi.mock('socket.io-client', () => ({
  io: () => socketMock,
}));

describe('Socket', () => {
  let service: Socket;
  let consoleError: ReturnType<typeof vi.spyOn>;
  const idToken = signal<string | null | undefined>(undefined);

  const connectSocket = () => {
    socketMock.connected = true;
    socketMock.active = true;
    handlers.get('connect')?.();
    TestBed.tick();
  };

  const joinCalls = () => socketMock.emit.mock.calls.filter((call) => call[0] === 'joinBar');

  const rejectLastJoin = () => {
    const ack = joinCalls().at(-1)?.[2] as ((response: unknown) => void) | undefined;
    ack?.({ status: 'error', message: 'UNAUTHORIZED' });
  };

  const spyOnScheduling = () => {
    const scheduled: { delay: number; run: () => void }[] = [];
    const realSetTimeout = globalThis.setTimeout;

    vi.spyOn(globalThis, 'setTimeout').mockImplementation(((
      callback: () => void,
      delay?: number,
      ...rest: unknown[]
    ) => {
      if (delay === JOIN_BAR_RETRY_MS) {
        scheduled.push({ delay, run: callback });
        return 0 as unknown as ReturnType<typeof setTimeout>;
      }

      return realSetTimeout(callback, delay, ...rest);
    }) as typeof setTimeout);

    return scheduled;
  };

  beforeEach(() => {
    vi.clearAllMocks();
    handlers.clear();
    socketMock.connected = false;
    socketMock.active = false;
    socketMock.auth = {};
    idToken.set(undefined);
    consoleError = vi.spyOn(console, 'error').mockReturnValue(undefined);

    TestBed.configureTestingModule({
      providers: [provideZonelessChangeDetection(), { provide: Auth, useValue: { idToken: idToken.asReadonly() } }],
    });

    service = TestBed.inject(Socket);
    TestBed.tick();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should not connect before a session token exists', () => {
    expect(socketMock.on).not.toHaveBeenCalled();
  });

  it('should join the bar room once the token arrives after joinBar was requested', () => {
    service.joinBar('bar-1');

    idToken.set('token-123');
    TestBed.tick();
    connectSocket();

    expect(socketMock.emit).toHaveBeenCalledWith('joinBar', 'bar-1', expect.any(Function));
  });

  it('should re-join the room after a reconnect', () => {
    idToken.set('token-123');
    TestBed.tick();
    connectSocket();

    service.joinBar('bar-1');
    socketMock.emit.mockClear();

    connectSocket();

    expect(socketMock.emit).toHaveBeenCalledWith('joinBar', 'bar-1', expect.any(Function));
  });

  it('should forget the room once the user leaves it', () => {
    idToken.set('token-123');
    TestBed.tick();
    connectSocket();

    service.joinBar('bar-1');
    service.leaveBar('bar-1');
    socketMock.emit.mockClear();

    connectSocket();

    expect(socketMock.emit).not.toHaveBeenCalledWith('joinBar', 'bar-1', expect.any(Function));
  });

  it('should join even when the workspace asks before the socket exists', () => {
    service.joinBar('bar-1');
    expect(socketMock.emit).not.toHaveBeenCalled();

    idToken.set('token-123');
    TestBed.tick();
    connectSocket();

    expect(socketMock.emit).toHaveBeenCalledWith('joinBar', 'bar-1', expect.any(Function));
  });

  it('should retry a rejected join instead of silently staying out of the room', () => {
    service.joinBar('bar-1');
    idToken.set('token-123');
    TestBed.tick();
    connectSocket();

    expect(joinCalls()).toHaveLength(1);

    const scheduled = spyOnScheduling();
    rejectLastJoin();

    expect(consoleError).toHaveBeenCalled();
    expect(scheduled).toHaveLength(1);
    expect(scheduled[0].delay).toBe(JOIN_BAR_RETRY_MS);

    scheduled[0].run();

    expect(joinCalls()).toHaveLength(2);
  });

  it('should stop retrying a join once the workspace moved to another bar', () => {
    service.joinBar('bar-1');
    idToken.set('token-123');
    TestBed.tick();
    connectSocket();

    const scheduled = spyOnScheduling();
    service.leaveBar('bar-1');
    rejectLastJoin();

    expect(scheduled).toHaveLength(0);
    expect(joinCalls().filter((call) => call[1] === 'bar-1')).toHaveLength(1);
  });

  it('should give up after a few rejected joins rather than retrying forever', () => {
    service.joinBar('bar-1');
    idToken.set('token-123');
    TestBed.tick();
    connectSocket();

    const scheduled = spyOnScheduling();
    rejectLastJoin();

    while (scheduled.length > 0) {
      scheduled.shift()?.run();
      rejectLastJoin();
    }

    expect(joinCalls()).toHaveLength(3);
  });

  it('should not open a second connection while the first one is still connecting', () => {
    idToken.set('token-123');
    TestBed.tick();

    socketMock.active = true;

    idToken.set('token-refreshed');
    TestBed.tick();

    expect(socketMock.connect).not.toHaveBeenCalled();
    expect(socketMock.auth).toEqual({ token: 'token-refreshed' });
  });
});
