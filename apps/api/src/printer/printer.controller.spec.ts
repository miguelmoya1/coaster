import {
  CanActivate,
  ConflictException,
  ForbiddenException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { Test, TestingModule } from '@nestjs/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { FirebaseAuthGuard } from '../auth';
import { BarPermissionsGuard } from '../core';
import { RegisterPrinterIpCommand } from './commands';
import { PrinterConnectionController } from './printer-connection.controller';
import { PrinterController } from './printer.controller';
import { GetPrinterConnectionQuery } from './queries';

describe('Printer Controllers', () => {
  let printerController: PrinterController;
  let connectionController: PrinterConnectionController;
  let commandBus: { execute: ReturnType<typeof vi.fn> };
  let queryBus: { execute: ReturnType<typeof vi.fn> };
  const mockGuard: CanActivate = { canActivate: () => true };

  beforeEach(async () => {
    commandBus = { execute: vi.fn() };
    queryBus = { execute: vi.fn() };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [PrinterController, PrinterConnectionController],
      providers: [
        { provide: CommandBus, useValue: commandBus },
        { provide: QueryBus, useValue: queryBus },
      ],
    })
      .overrideGuard(FirebaseAuthGuard)
      .useValue(mockGuard)
      .overrideGuard(BarPermissionsGuard)
      .useValue(mockGuard)
      .compile();

    printerController = module.get(PrinterController);
    connectionController = module.get(PrinterConnectionController);
  });

  describe('PrinterController', () => {
    describe('checkVersion', () => {
      it('should return linux version details', () => {
        const result = printerController.checkVersion('linux');
        expect(result.version).toBeDefined();
        expect(result.url).toContain('printer-service-linux');
      });

      it('should return windows version details', () => {
        const result = printerController.checkVersion('windows');
        expect(result.version).toBeDefined();
        expect(result.url).toContain('printer-service-windows.exe');
      });

      it('should throw BadRequestException for unsupported OS', () => {
        expect(() => printerController.checkVersion('mac')).toThrow();
      });
    });

    describe('registerIp', () => {
      it('should throw UnauthorizedException if device key header is missing', async () => {
        await expect(
          printerController.registerIp(undefined, { barId: 'bar-1' as any, ipAddress: '192.168.1.100' }),
        ).rejects.toThrow(UnauthorizedException);
      });

      it('should execute RegisterPrinterIpCommand with device key', async () => {
        commandBus.execute.mockResolvedValue(undefined);

        await printerController.registerIp('my-device-key', {
          barId: 'bar-1' as any,
          ipAddress: '192.168.1.100',
        });

        expect(commandBus.execute).toHaveBeenCalledWith(expect.any(RegisterPrinterIpCommand));
        const command = commandBus.execute.mock.calls[0][0] as RegisterPrinterIpCommand;
        expect(command.barId).toBe('bar-1');
        expect(command.ipAddress).toBe('192.168.1.100');
        expect(command.deviceKey).toBe('my-device-key');
      });

      it('should propagate ForbiddenException from command handler', async () => {
        commandBus.execute.mockRejectedValue(new ForbiddenException('Invalid device key'));

        await expect(
          printerController.registerIp('wrong-key', {
            barId: 'bar-1' as any,
            ipAddress: '192.168.1.100',
          }),
        ).rejects.toThrow(ForbiddenException);
      });
    });
  });

  describe('PrinterConnectionController', () => {
    describe('getConnection', () => {
      it('should return connection details from query bus', async () => {
        const expected = { ipAddress: '192.168.1.100', port: 8080, token: 'jwt-token' };
        queryBus.execute.mockResolvedValue(expected);

        const result = await connectionController.getConnection('bar-1' as any);

        expect(queryBus.execute).toHaveBeenCalledWith(expect.any(GetPrinterConnectionQuery));
        expect(result).toEqual(expected);
      });

      it('should propagate NotFoundException if printer not registered', async () => {
        queryBus.execute.mockRejectedValue(new NotFoundException('Printer not connected'));

        await expect(connectionController.getConnection('bar-1' as any)).rejects.toThrow(NotFoundException);
      });
    });

    describe('getStatus', () => {
      it('should return printer status', async () => {
        const expected = {
          barId: 'bar-1',
          isOnline: true,
          ipAddress: '192.168.1.100',
          port: 8080,
          lastSeenAt: '2026-07-13T20:00:00.000Z',
        };
        queryBus.execute.mockResolvedValue(expected);

        const result = await connectionController.getStatus('bar-1' as any);
        expect(result).toEqual(expected);
      });
    });

    describe('generateDeviceKey', () => {
      it('should return device key from command bus', async () => {
        commandBus.execute.mockResolvedValue({ deviceKey: 'uuid-key-123' });

        const result = await connectionController.generateDeviceKey('bar-1' as any);
        expect(result.deviceKey).toBe('uuid-key-123');
      });

      it('should propagate ConflictException if key already exists', async () => {
        commandBus.execute.mockRejectedValue(new ConflictException('Already exists'));

        await expect(connectionController.generateDeviceKey('bar-1' as any)).rejects.toThrow(ConflictException);
      });
    });
  });
});
