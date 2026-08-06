import { provideZonelessChangeDetection, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Auth } from './auth';
import { Socket } from './socket';

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
  const idToken = signal<string | null | undefined>(undefined);

  const connectSocket = () => {
    socketMock.connected = true;
    socketMock.active = true;
    handlers.get('connect')?.();
    TestBed.tick();
  };

  beforeEach(() => {
    vi.clearAllMocks();
    handlers.clear();
    socketMock.connected = false;
    socketMock.active = false;
    idToken.set(undefined);

    TestBed.configureTestingModule({
      providers: [provideZonelessChangeDetection(), { provide: Auth, useValue: { idToken: idToken.asReadonly() } }],
    });

    service = TestBed.inject(Socket);
    TestBed.tick();
  });

  it('should not connect before a session token exists', () => {
    expect(socketMock.on).not.toHaveBeenCalled();
  });

  it('should join the bar room once the token arrives after joinBar was requested', () => {
    service.joinBar('bar-1');

    idToken.set('token-123');
    TestBed.tick();
    connectSocket();

    expect(socketMock.emit).toHaveBeenCalledWith('joinBar', 'bar-1');
  });

  it('should re-join the room after a reconnect', () => {
    idToken.set('token-123');
    TestBed.tick();
    connectSocket();

    service.joinBar('bar-1');
    socketMock.emit.mockClear();

    connectSocket();

    expect(socketMock.emit).toHaveBeenCalledWith('joinBar', 'bar-1');
  });

  it('should forget the room once the user leaves it', () => {
    idToken.set('token-123');
    TestBed.tick();
    connectSocket();

    service.joinBar('bar-1');
    service.leaveBar('bar-1');
    socketMock.emit.mockClear();

    connectSocket();

    expect(socketMock.emit).not.toHaveBeenCalledWith('joinBar', 'bar-1');
  });

  it('should join even when the workspace asks before the socket exists', () => {
    service.joinBar('bar-1');
    expect(socketMock.emit).not.toHaveBeenCalled();

    idToken.set('token-123');
    TestBed.tick();
    connectSocket();

    expect(socketMock.emit).toHaveBeenCalledWith('joinBar', 'bar-1');
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
