import { ErrorCodes } from '@coaster/common';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PrinterReadRepository } from '../../data-access/printer.read.repository';
import { PrinterWriteRepository } from '../../data-access/printer.write.repository';
import { DeviceKeyService } from '../../services/device-key.service';
import { RegisterPrinterIpCommand } from '../impl/register-printer-ip.command';
import { RegisterPrinterIpHandler } from './register-printer-ip.handler';

describe('RegisterPrinterIpHandler', () => {
  let handler: RegisterPrinterIpHandler;
  let readRepo: { findByBarId: ReturnType<typeof vi.fn> };
  let writeRepo: { upsertPrinterConfig: ReturnType<typeof vi.fn> };

  beforeEach(async () => {
    readRepo = { findByBarId: vi.fn() };
    writeRepo = { upsertPrinterConfig: vi.fn().mockResolvedValue({}) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RegisterPrinterIpHandler,
        DeviceKeyService,
        { provide: PrinterReadRepository, useValue: readRepo },
        { provide: PrinterWriteRepository, useValue: writeRepo },
      ],
    }).compile();

    handler = module.get(RegisterPrinterIpHandler);
  });

  const command = (deviceKey: string, port?: number) =>
    new RegisterPrinterIpCommand('bar-1' as any, '192.168.1.100', deviceKey, port);

  it('should throw NotFoundException with PRINTER_NOT_CONFIGURED if no config exists', async () => {
    readRepo.findByBarId.mockResolvedValue(null);

    await expect(handler.execute(command('key-123'))).rejects.toThrow(NotFoundException);
    await expect(handler.execute(command('key-123'))).rejects.toThrow(ErrorCodes.PRINTER_NOT_CONFIGURED);
  });

  it('should throw ForbiddenException with PRINTER_INVALID_DEVICE_KEY if key does not match', async () => {
    readRepo.findByBarId.mockResolvedValue({ barId: 'bar-1', deviceKey: 'correct-key' });

    await expect(handler.execute(command('wrong-key'))).rejects.toThrow(ForbiddenException);
    await expect(handler.execute(command('wrong-key'))).rejects.toThrow(ErrorCodes.PRINTER_INVALID_DEVICE_KEY);
  });

  it('should reject a key that is merely a prefix of the real one', async () => {
    readRepo.findByBarId.mockResolvedValue({ barId: 'bar-1', deviceKey: 'correct-key-abc' });

    await expect(handler.execute(command('correct-key'))).rejects.toThrow(ForbiddenException);
  });

  it('should persist the address when the device key matches', async () => {
    readRepo.findByBarId.mockResolvedValue({ barId: 'bar-1', deviceKey: 'correct-key-abc' });

    await handler.execute(command('correct-key-abc'));

    expect(writeRepo.upsertPrinterConfig).toHaveBeenCalledWith('bar-1', '192.168.1.100', undefined);
  });

  it('should persist the port the bridge reports', async () => {
    readRepo.findByBarId.mockResolvedValue({ barId: 'bar-1', deviceKey: 'correct-key-abc' });

    await handler.execute(command('correct-key-abc', 9090));

    expect(writeRepo.upsertPrinterConfig).toHaveBeenCalledWith('bar-1', '192.168.1.100', 9090);
  });
});
