import { ErrorCodes, SocketEvents } from '@coaster/logic';
import { Logger } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { WsException } from '@nestjs/websockets';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { BarGateway } from './bar.gateway';

describe('BarGateway', () => {
  let gateway: BarGateway;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [BarGateway],
    }).compile();

    gateway = module.get<BarGateway>(BarGateway);
    gateway.server = { to: vi.fn().mockReturnThis(), emit: vi.fn() } as any;

    // Suppress logger outputs during tests
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    vi.spyOn(Logger.prototype, 'debug').mockImplementation(() => {});
  });

  const createSocketMock = () =>
    ({
      id: 'mock-socket-id',
      join: vi.fn(),
      leave: vi.fn(),
    }) as any;

  describe('handleConnection / handleDisconnect', () => {
    it('debería no fallar al conectar', () => {
      expect(() => gateway.handleConnection(createSocketMock())).not.toThrow();
    });

    it('debería no fallar al desconectar', () => {
      expect(() => gateway.handleDisconnect(createSocketMock())).not.toThrow();
    });
  });

  describe('handleJoinBar', () => {
    it('debería unir el socket a la sala del bar y devolver joined', () => {
      const socket = createSocketMock();

      const result = gateway.handleJoinBar(socket, 'bar-1');

      expect(socket.join).toHaveBeenCalledWith('bar-1');
      expect(result).toEqual({ event: SocketEvents.JOINED, data: 'bar-1' });
    });

    it('debería lanzar WsException si el barId es inválido (nulo)', () => {
      const socket = createSocketMock();

      expect(() => gateway.handleJoinBar(socket, null as any)).toThrow(WsException);
      expect(() => gateway.handleJoinBar(socket, null as any)).toThrow(ErrorCodes.INVALID_BAR_ID);
      expect(socket.join).not.toHaveBeenCalled();
    });

    it('debería lanzar WsException si el barId está vacío', () => {
      const socket = createSocketMock();

      expect(() => gateway.handleJoinBar(socket, '   ')).toThrow(WsException);
      expect(socket.join).not.toHaveBeenCalled();
    });
  });

  describe('handleLeaveBar', () => {
    it('debería sacar al socket de la sala del bar y devolver left', () => {
      const socket = createSocketMock();

      const result = gateway.handleLeaveBar(socket, 'bar-1');

      expect(socket.leave).toHaveBeenCalledWith('bar-1');
      expect(result).toEqual({ event: SocketEvents.LEFT, data: 'bar-1' });
    });

    it('debería lanzar WsException si el barId es inválido (nulo)', () => {
      const socket = createSocketMock();

      expect(() => gateway.handleLeaveBar(socket, null as any)).toThrow(WsException);
      expect(() => gateway.handleLeaveBar(socket, null as any)).toThrow(ErrorCodes.INVALID_BAR_ID);
      expect(socket.leave).not.toHaveBeenCalled();
    });
  });
});
