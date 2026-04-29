import { ErrorCodes, SocketEvents } from '@coaster/common';
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
    gateway.server = { to: vi.fn().mockReturnThis(), emit: vi.fn() };

    vi.spyOn(Logger.prototype, 'debug').mockImplementation(() => {
      // do nothing
    });
  });

  const createSocketMock = () => ({
    id: 'mock-socket-id',
    join: vi.fn(),
    leave: vi.fn(),
  });

  describe('handleConnection / handleDisconnect', () => {
    it('should not fail on connect', () => {
      expect(() => gateway.handleConnection(createSocketMock())).not.toThrow();
    });

    it('should not fail on disconnect', () => {
      expect(() => gateway.handleDisconnect(createSocketMock())).not.toThrow();
    });
  });

  describe('handleJoinBar', () => {
    it('should join the socket to the bar room and return joined', () => {
      const socket = createSocketMock();

      const result = gateway.handleJoinBar(socket, 'bar-1');

      expect(socket.join).toHaveBeenCalledWith('bar-1');
      expect(result).toEqual({ event: SocketEvents.JOINED, data: 'bar-1' });
    });

    it('should throw WsException if barId is invalid (null)', () => {
      const socket = createSocketMock();

      expect(() => gateway.handleJoinBar(socket, null)).toThrow(WsException);
      expect(() => gateway.handleJoinBar(socket, null)).toThrow(ErrorCodes.INVALID_BAR_ID);
      expect(socket.join).not.toHaveBeenCalled();
    });

    it('should throw WsException if barId is empty', () => {
      const socket = createSocketMock();

      expect(() => gateway.handleJoinBar(socket, '   ')).toThrow(WsException);
      expect(socket.join).not.toHaveBeenCalled();
    });
  });

  describe('handleLeaveBar', () => {
    it('should remove socket from bar room and return left', () => {
      const socket = createSocketMock();

      const result = gateway.handleLeaveBar(socket, 'bar-1');

      expect(socket.leave).toHaveBeenCalledWith('bar-1');
      expect(result).toEqual({ event: SocketEvents.LEFT, data: 'bar-1' });
    });

    it('should throw WsException if barId is invalid (null)', () => {
      const socket = createSocketMock();

      expect(() => gateway.handleLeaveBar(socket, null)).toThrow(WsException);
      expect(() => gateway.handleLeaveBar(socket, null)).toThrow(ErrorCodes.INVALID_BAR_ID);
      expect(socket.leave).not.toHaveBeenCalled();
    });
  });
});
