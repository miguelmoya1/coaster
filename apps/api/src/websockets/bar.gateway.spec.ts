import { BarId, ErrorCodes, SocketEvents } from '@coaster/common';
import { Logger } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { WsException } from '@nestjs/websockets';
import { Socket } from 'socket.io';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { BarGateway } from './bar.gateway';
import { WsAuthService } from './services';

describe('BarGateway', () => {
  let gateway: BarGateway;
  const wsAuth = {
    authenticate: vi.fn(),
    canAccessBar: vi.fn(),
  };

  beforeEach(async () => {
    vi.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [BarGateway, { provide: WsAuthService, useValue: wsAuth }],
    }).compile();

    gateway = module.get<BarGateway>(BarGateway);
    gateway.server = { to: vi.fn().mockReturnThis(), emit: vi.fn() } as any;

    vi.spyOn(Logger.prototype, 'debug').mockReturnValue(undefined);
    vi.spyOn(Logger.prototype, 'warn').mockReturnValue(undefined);
  });

  const createSocketMock = (userId?: string) =>
    ({
      id: 'mock-socket-id',
      data: userId ? { userId } : {},
      join: vi.fn(),
      leave: vi.fn(),
      emit: vi.fn(),
      disconnect: vi.fn(),
    }) as unknown as Socket & { data: { userId?: string } };

  const runHandshake = async (socket: Socket) => {
    const server = { use: vi.fn() } as any;
    gateway.afterInit(server);

    const middleware = server.use.mock.calls[0][0];
    await new Promise<void>((resolve) => middleware(socket, () => resolve()));
  };

  describe('afterInit', () => {
    it('should settle the identity during the handshake, before any message is dispatched', async () => {
      const socket = createSocketMock();
      wsAuth.authenticate.mockResolvedValue('user-1');

      await runHandshake(socket);

      expect(socket.data.userId).toBe('user-1');
    });

    it('should let an unauthenticated handshake through so the connection can reject it properly', async () => {
      const socket = createSocketMock();
      wsAuth.authenticate.mockResolvedValue(null);

      await runHandshake(socket);

      expect(socket.data.userId).toBeUndefined();
    });

    it('should not wedge the handshake when authentication blows up', async () => {
      const socket = createSocketMock();
      wsAuth.authenticate.mockRejectedValue(new Error('firebase down'));

      await expect(runHandshake(socket)).resolves.toBeUndefined();
      expect(socket.data.userId).toBeUndefined();
    });

    it('should let a join issued the instant the socket connects succeed', async () => {
      const socket = createSocketMock();
      wsAuth.authenticate.mockResolvedValue('user-1');
      wsAuth.canAccessBar.mockResolvedValue(true);

      await runHandshake(socket);
      const result = await gateway.handleJoinBar(socket as any, 'bar-1' as BarId);

      expect(socket.join).toHaveBeenCalledWith('bar-1');
      expect(result).toEqual({ event: SocketEvents.joined, data: 'bar-1' });
    });
  });

  describe('handleConnection', () => {
    it('should keep a socket whose identity the handshake resolved', () => {
      const socket = createSocketMock('user-1');

      gateway.handleConnection(socket);

      expect(socket.data.userId).toBe('user-1');
      expect(socket.disconnect).not.toHaveBeenCalled();
    });

    it('should drop the connection when the handshake cannot be authenticated', () => {
      const socket = createSocketMock();

      gateway.handleConnection(socket);

      expect(socket.emit).toHaveBeenCalledWith(SocketEvents.unauthorized, { message: ErrorCodes.UNAUTHORIZED });
      expect(socket.disconnect).toHaveBeenCalledWith(true);
      expect(socket.data.userId).toBeUndefined();
    });
  });

  describe('handleJoinBar', () => {
    it('should join the socket to the bar room and return joined', async () => {
      const socket = createSocketMock('user-1');
      wsAuth.canAccessBar.mockResolvedValue(true);

      const result = await gateway.handleJoinBar(socket, 'bar-1');

      expect(wsAuth.canAccessBar).toHaveBeenCalledWith('user-1', 'bar-1');
      expect(socket.join).toHaveBeenCalledWith('bar-1');
      expect(result).toEqual({ event: SocketEvents.joined, data: 'bar-1' });
    });

    it('should refuse to join a bar the user does not belong to', async () => {
      const socket = createSocketMock('user-1');
      wsAuth.canAccessBar.mockResolvedValue(false);

      await expect(gateway.handleJoinBar(socket, 'bar-of-someone-else')).rejects.toThrow(WsException);
      expect(socket.join).not.toHaveBeenCalled();
    });

    it('should refuse to join when the socket carries no authenticated user', async () => {
      const socket = createSocketMock();

      await expect(gateway.handleJoinBar(socket, 'bar-1')).rejects.toThrow(ErrorCodes.UNAUTHORIZED);
      expect(wsAuth.canAccessBar).not.toHaveBeenCalled();
      expect(socket.join).not.toHaveBeenCalled();
    });

    it('should throw WsException if barId is invalid (null)', async () => {
      const socket = createSocketMock('user-1');

      await expect(gateway.handleJoinBar(socket, null as unknown as BarId)).rejects.toThrow(WsException);
      await expect(gateway.handleJoinBar(socket, null as unknown as BarId)).rejects.toThrow(ErrorCodes.INVALID_BAR_ID);
      expect(socket.join).not.toHaveBeenCalled();
    });

    it('should throw WsException if barId is empty', async () => {
      const socket = createSocketMock('user-1');

      await expect(gateway.handleJoinBar(socket, '   ')).rejects.toThrow(WsException);
      expect(socket.join).not.toHaveBeenCalled();
    });
  });

  describe('handleLeaveBar', () => {
    it('should remove socket from bar room and return left', async () => {
      const socket = createSocketMock('user-1');

      const result = await gateway.handleLeaveBar(socket, 'bar-1');

      expect(socket.leave).toHaveBeenCalledWith('bar-1');
      expect(result).toEqual({ event: SocketEvents.left, data: 'bar-1' });
    });

    it('should throw WsException if barId is invalid (null)', async () => {
      const socket = createSocketMock('user-1');

      await expect(gateway.handleLeaveBar(socket, null as unknown as BarId)).rejects.toThrow(WsException);
      await expect(gateway.handleLeaveBar(socket, null as unknown as BarId)).rejects.toThrow(ErrorCodes.INVALID_BAR_ID);
      expect(socket.leave).not.toHaveBeenCalled();
    });
  });
});
