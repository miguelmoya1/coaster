import { EstablishmentId, ErrorCodes, SocketEvents } from '@coaster/common';
import { Logger } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { WsException } from '@nestjs/websockets';
import { Socket } from 'socket.io';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { EstablishmentGateway } from './establishment.gateway';
import { WsAuthService } from './services';

describe('EstablishmentGateway', () => {
  let gateway: EstablishmentGateway;
  const wsAuth = {
    authenticate: vi.fn(),
    canAccessEstablishment: vi.fn(),
  };

  beforeEach(async () => {
    vi.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [EstablishmentGateway, { provide: WsAuthService, useValue: wsAuth }],
    }).compile();

    gateway = module.get<EstablishmentGateway>(EstablishmentGateway);
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
      wsAuth.canAccessEstablishment.mockResolvedValue(true);

      await runHandshake(socket);
      const result = await gateway.handleJoinEstablishment(socket as any, 'establishment-1' as EstablishmentId);

      expect(socket.join).toHaveBeenCalledWith('establishment-1');
      expect(result).toEqual({ event: SocketEvents.joined, data: 'establishment-1' });
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

  describe('handleJoinEstablishment', () => {
    it('should join the socket to the establishment room and return joined', async () => {
      const socket = createSocketMock('user-1');
      wsAuth.canAccessEstablishment.mockResolvedValue(true);

      const result = await gateway.handleJoinEstablishment(socket, 'establishment-1');

      expect(wsAuth.canAccessEstablishment).toHaveBeenCalledWith('user-1', 'establishment-1');
      expect(socket.join).toHaveBeenCalledWith('establishment-1');
      expect(result).toEqual({ event: SocketEvents.joined, data: 'establishment-1' });
    });

    it('should refuse to join an establishment the user does not belong to', async () => {
      const socket = createSocketMock('user-1');
      wsAuth.canAccessEstablishment.mockResolvedValue(false);

      await expect(gateway.handleJoinEstablishment(socket, 'establishment-of-someone-else')).rejects.toThrow(
        WsException,
      );
      expect(socket.join).not.toHaveBeenCalled();
    });

    it('should refuse to join when the socket carries no authenticated user', async () => {
      const socket = createSocketMock();

      await expect(gateway.handleJoinEstablishment(socket, 'establishment-1')).rejects.toThrow(ErrorCodes.UNAUTHORIZED);
      expect(wsAuth.canAccessEstablishment).not.toHaveBeenCalled();
      expect(socket.join).not.toHaveBeenCalled();
    });

    it('should throw WsException if establishmentId is invalid (null)', async () => {
      const socket = createSocketMock('user-1');

      await expect(gateway.handleJoinEstablishment(socket, null as unknown as EstablishmentId)).rejects.toThrow(
        WsException,
      );
      await expect(gateway.handleJoinEstablishment(socket, null as unknown as EstablishmentId)).rejects.toThrow(
        ErrorCodes.INVALID_ESTABLISHMENT_ID,
      );
      expect(socket.join).not.toHaveBeenCalled();
    });

    it('should throw WsException if establishmentId is empty', async () => {
      const socket = createSocketMock('user-1');

      await expect(gateway.handleJoinEstablishment(socket, '   ')).rejects.toThrow(WsException);
      expect(socket.join).not.toHaveBeenCalled();
    });
  });

  describe('handleLeaveEstablishment', () => {
    it('should remove socket from establishment room and return left', async () => {
      const socket = createSocketMock('user-1');

      const result = await gateway.handleLeaveEstablishment(socket, 'establishment-1');

      expect(socket.leave).toHaveBeenCalledWith('establishment-1');
      expect(result).toEqual({ event: SocketEvents.left, data: 'establishment-1' });
    });

    it('should throw WsException if establishmentId is invalid (null)', async () => {
      const socket = createSocketMock('user-1');

      await expect(gateway.handleLeaveEstablishment(socket, null as unknown as EstablishmentId)).rejects.toThrow(
        WsException,
      );
      await expect(gateway.handleLeaveEstablishment(socket, null as unknown as EstablishmentId)).rejects.toThrow(
        ErrorCodes.INVALID_ESTABLISHMENT_ID,
      );
      expect(socket.leave).not.toHaveBeenCalled();
    });
  });
});
