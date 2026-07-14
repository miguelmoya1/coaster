import { ErrorCodes } from '@coaster/common';
import { ConflictException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PrinterReadRepository } from '../../data-access/printer.read.repository';
import { PrinterWriteRepository } from '../../data-access/printer.write.repository';
import { GenerateDeviceKeyCommand } from '../impl/generate-device-key.command';
import { GenerateDeviceKeyHandler } from './generate-device-key.handler';

describe('GenerateDeviceKeyHandler', () => {
  let handler: GenerateDeviceKeyHandler;
  let readRepo: { findByBarId: ReturnType<typeof vi.fn> };
  let writeRepo: { createPrinterConfig: ReturnType<typeof vi.fn> };

  beforeEach(async () => {
    readRepo = {
      findByBarId: vi.fn(),
    };
    writeRepo = {
      createPrinterConfig: vi.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GenerateDeviceKeyHandler,
        { provide: PrinterReadRepository, useValue: readRepo },
        { provide: PrinterWriteRepository, useValue: writeRepo },
      ],
    }).compile();

    handler = module.get(GenerateDeviceKeyHandler);
  });

  it('should throw ConflictException with PRINTER_ALREADY_CONFIGURED if config already exists', async () => {
    readRepo.findByBarId.mockResolvedValue({ barId: 'bar-1', deviceKey: 'existing-key' });

    await expect(handler.execute(new GenerateDeviceKeyCommand('bar-1' as any))).rejects.toThrow(ConflictException);

    try {
      await handler.execute(new GenerateDeviceKeyCommand('bar-1' as any));
    } catch (e: any) {
      expect(e.message).toBe(ErrorCodes.PRINTER_ALREADY_CONFIGURED);
    }
  });

  it('should create printer config and return the device key', async () => {
    readRepo.findByBarId.mockResolvedValue(null);
    writeRepo.createPrinterConfig.mockResolvedValue({
      barId: 'bar-1',
      deviceKey: 'generated-uuid-key',
    });

    const result = await handler.execute(new GenerateDeviceKeyCommand('bar-1' as any));

    expect(result.deviceKey).toBe('generated-uuid-key');
    expect(writeRepo.createPrinterConfig).toHaveBeenCalledWith('bar-1');
  });
});
