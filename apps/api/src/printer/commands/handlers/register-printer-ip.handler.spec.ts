import { ErrorCodes } from '@coaster/common';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PrinterReadRepository } from '../../data-access/printer.read.repository';
import { PrinterWriteRepository } from '../../data-access/printer.write.repository';
import { RegisterPrinterIpCommand } from '../impl/register-printer-ip.command';
import { RegisterPrinterIpHandler } from './register-printer-ip.handler';

describe('RegisterPrinterIpHandler', () => {
  let handler: RegisterPrinterIpHandler;
  let readRepo: { findByBarId: ReturnType<typeof vi.fn> };
  let writeRepo: { upsertPrinterConfig: ReturnType<typeof vi.fn> };

  beforeEach(async () => {
    readRepo = {
      findByBarId: vi.fn(),
    };
    writeRepo = {
      upsertPrinterConfig: vi.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RegisterPrinterIpHandler,
        { provide: PrinterReadRepository, useValue: readRepo },
        { provide: PrinterWriteRepository, useValue: writeRepo },
      ],
    }).compile();

    handler = module.get(RegisterPrinterIpHandler);
  });

  it('should throw NotFoundException with PRINTER_NOT_CONFIGURED if no config exists', async () => {
    readRepo.findByBarId.mockResolvedValue(null);

    await expect(
      handler.execute(new RegisterPrinterIpCommand('bar-1' as any, '192.168.1.100', 'key-123')),
    ).rejects.toThrow(NotFoundException);

    try {
      await handler.execute(new RegisterPrinterIpCommand('bar-1' as any, '192.168.1.100', 'key-123'));
    } catch (e: any) {
      expect(e.message).toBe(ErrorCodes.PRINTER_NOT_CONFIGURED);
    }
  });

  it('should throw ForbiddenException with PRINTER_INVALID_DEVICE_KEY if key does not match', async () => {
    readRepo.findByBarId.mockResolvedValue({ barId: 'bar-1', deviceKey: 'correct-key' });

    await expect(
      handler.execute(new RegisterPrinterIpCommand('bar-1' as any, '192.168.1.100', 'wrong-key')),
    ).rejects.toThrow(ForbiddenException);

    try {
      await handler.execute(new RegisterPrinterIpCommand('bar-1' as any, '192.168.1.100', 'wrong-key'));
    } catch (e: any) {
      expect(e.message).toBe(ErrorCodes.PRINTER_INVALID_DEVICE_KEY);
    }
  });

  it('should persist IP when device key matches', async () => {
    readRepo.findByBarId.mockResolvedValue({ barId: 'bar-1', deviceKey: 'correct-key-abc' });
    writeRepo.upsertPrinterConfig.mockResolvedValue({});

    await handler.execute(new RegisterPrinterIpCommand('bar-1' as any, '192.168.1.100', 'correct-key-abc'));

    expect(writeRepo.upsertPrinterConfig).toHaveBeenCalledWith('bar-1', '192.168.1.100');
  });
});
