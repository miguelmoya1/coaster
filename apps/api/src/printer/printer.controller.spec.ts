import { FirebaseAuthGuard } from '@coaster/auth';
import { EstablishmentPermissionsGuard } from '@coaster/core';
import {
  BadRequestException,
  CanActivate,
  ForbiddenException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { Test, TestingModule } from '@nestjs/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { EnqueuePrintJobCommand, RegisterPrinterIpCommand, ReportPrintJobResultCommand } from './commands';
import { PrinterConnectionController } from './printer-connection.controller';
import { PrinterController } from './printer.controller';
import { ClaimNextPrintJobQuery, GetPrinterConnectionQuery } from './queries';
import { PrinterReleaseService } from './services/printer-release.service';

describe('Printer Controllers', () => {
  let printerController: PrinterController;
  let connectionController: PrinterConnectionController;
  let commandBus: { execute: ReturnType<typeof vi.fn> };
  let queryBus: { execute: ReturnType<typeof vi.fn> };
  let releases: { find: ReturnType<typeof vi.fn> };
  const mockGuard: CanActivate = { canActivate: () => true };

  beforeEach(async () => {
    commandBus = { execute: vi.fn() };
    queryBus = { execute: vi.fn() };
    releases = { find: vi.fn() };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [PrinterController, PrinterConnectionController],
      providers: [
        { provide: CommandBus, useValue: commandBus },
        { provide: QueryBus, useValue: queryBus },
        { provide: PrinterReleaseService, useValue: releases },
      ],
    })
      .overrideGuard(FirebaseAuthGuard)
      .useValue(mockGuard)
      .overrideGuard(EstablishmentPermissionsGuard)
      .useValue(mockGuard)
      .compile();

    printerController = module.get(PrinterController);
    connectionController = module.get(PrinterConnectionController);
  });

  describe('PrinterController', () => {
    describe('checkVersion', () => {
      it('should return the published release for an OS', async () => {
        releases.find.mockResolvedValue({
          version: '1.1.0',
          url: 'https://api.example.com/public/downloads/printer-service-linux',
          sha256: 'a'.repeat(64),
        });

        const result = await printerController.checkVersion('linux');

        expect(releases.find).toHaveBeenCalledWith('linux');
        expect(result.version).toBe('1.1.0');
        expect(result.url).toContain('printer-service-linux');
      });

      it('should reject an OS with no published binary', async () => {
        releases.find.mockResolvedValue(null);

        await expect(printerController.checkVersion('mac')).rejects.toThrow(BadRequestException);
      });
    });

    describe('registerIp', () => {
      it('should throw UnauthorizedException if device key header is missing', async () => {
        await expect(
          printerController.registerIp(undefined, {
            establishmentId: 'establishment-1' as any,
            ipAddress: '192.168.1.100',
          }),
        ).rejects.toThrow(UnauthorizedException);
      });

      it('should forward the address, port and device key', async () => {
        commandBus.execute.mockResolvedValue(undefined);

        await printerController.registerIp('my-device-key', {
          establishmentId: 'establishment-1' as any,
          ipAddress: '192.168.1.100',
          port: 9090,
        });

        const command = commandBus.execute.mock.calls[0][0] as RegisterPrinterIpCommand;
        expect(command).toBeInstanceOf(RegisterPrinterIpCommand);
        expect(command.establishmentId).toBe('establishment-1');
        expect(command.ipAddress).toBe('192.168.1.100');
        expect(command.port).toBe(9090);
        expect(command.deviceKey).toBe('my-device-key');
      });

      it('should propagate ForbiddenException from command handler', async () => {
        commandBus.execute.mockRejectedValue(new ForbiddenException('Invalid device key'));

        await expect(
          printerController.registerIp('wrong-key', {
            establishmentId: 'establishment-1' as any,
            ipAddress: '192.168.1.100',
          }),
        ).rejects.toThrow(ForbiddenException);
      });
    });

    describe('jobs/next', () => {
      it('should return a claimed job', async () => {
        const job = { id: 'job-1', payload: { type: 'order' as const } };
        queryBus.execute.mockResolvedValue(job);
        const reply = { status: vi.fn() };

        const result = await printerController.nextJob('key', 'establishment-1' as any, reply as any);

        expect(queryBus.execute).toHaveBeenCalledWith(expect.any(ClaimNextPrintJobQuery));
        expect(result).toEqual(job);
        expect(reply.status).not.toHaveBeenCalled();
      });

      it('should answer 204 when nothing is queued', async () => {
        queryBus.execute.mockResolvedValue(null);
        const reply = { status: vi.fn() };

        const result = await printerController.nextJob('key', 'establishment-1' as any, reply as any);

        expect(result).toBeUndefined();
        expect(reply.status).toHaveBeenCalledWith(204);
      });

      it('should require an establishmentId', async () => {
        const reply = { status: vi.fn() };

        await expect(printerController.nextJob('key', '' as any, reply as any)).rejects.toThrow(BadRequestException);
      });
    });

    describe('jobs/:id/result', () => {
      it('should forward the reported result', async () => {
        commandBus.execute.mockResolvedValue(undefined);

        await printerController.reportResult('key', 'establishment-1' as any, 'job-1', {
          status: 'failed',
          error: 'no paper',
        });

        const command = commandBus.execute.mock.calls[0][0] as ReportPrintJobResultCommand;
        expect(command).toBeInstanceOf(ReportPrintJobResultCommand);
        expect(command.jobId).toBe('job-1');
        expect(command.deviceKey).toBe('key');
        expect(command.result).toEqual({ status: 'failed', error: 'no paper' });
      });
    });
  });

  describe('PrinterConnectionController', () => {
    describe('print', () => {
      it('should queue a ticket and return its job id', async () => {
        commandBus.execute.mockResolvedValue({ jobId: 'job-1' });

        const result = await connectionController.print(
          'establishment-1' as any,
          { type: 'order', total: '9.00' } as any,
        );

        expect(commandBus.execute).toHaveBeenCalledWith(expect.any(EnqueuePrintJobCommand));
        expect(result).toEqual({ jobId: 'job-1' });
      });
    });

    describe('getConnection', () => {
      it('should return connection details from query bus', async () => {
        const expected = { ipAddress: '192.168.1.100', port: 8080, token: 'jwt-token' };
        queryBus.execute.mockResolvedValue(expected);

        const result = await connectionController.getConnection('establishment-1' as any);

        expect(queryBus.execute).toHaveBeenCalledWith(expect.any(GetPrinterConnectionQuery));
        expect(result).toEqual(expected);
      });

      it('should propagate NotFoundException if printer not registered', async () => {
        queryBus.execute.mockRejectedValue(new NotFoundException('Printer not connected'));

        await expect(connectionController.getConnection('establishment-1' as any)).rejects.toThrow(NotFoundException);
      });
    });

    describe('getStatus', () => {
      it('should return printer status', async () => {
        const expected = {
          establishmentId: 'establishment-1',
          isOnline: true,
          ipAddress: '192.168.1.100',
          port: 8080,
          lastSeenAt: '2026-07-13T20:00:00.000Z',
        };
        queryBus.execute.mockResolvedValue(expected);

        const result = await connectionController.getStatus('establishment-1' as any);
        expect(result).toEqual(expected);
      });
    });

    describe('generateDeviceKey', () => {
      it('should return the issued device key', async () => {
        commandBus.execute.mockResolvedValue({ deviceKey: 'uuid-key-123' });

        const result = await connectionController.generateDeviceKey('establishment-1' as any);
        expect(result.deviceKey).toBe('uuid-key-123');
      });
    });
  });
});
