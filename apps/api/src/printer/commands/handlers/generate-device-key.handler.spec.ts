import { Test, TestingModule } from '@nestjs/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PrinterReadRepository } from '../../data-access/printer.read.repository';
import { PrinterWriteRepository } from '../../data-access/printer.write.repository';
import { GenerateDeviceKeyCommand } from '../impl/generate-device-key.command';
import { GenerateDeviceKeyHandler } from './generate-device-key.handler';

describe('GenerateDeviceKeyHandler', () => {
  let handler: GenerateDeviceKeyHandler;
  let readRepo: { findByEstablishmentId: ReturnType<typeof vi.fn> };
  let writeRepo: {
    createPrinterConfig: ReturnType<typeof vi.fn>;
    rotateDeviceKey: ReturnType<typeof vi.fn>;
  };

  beforeEach(async () => {
    readRepo = { findByEstablishmentId: vi.fn() };
    writeRepo = {
      createPrinterConfig: vi.fn(),
      rotateDeviceKey: vi.fn().mockResolvedValue({}),
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

  it('should create the printer config and return the device key', async () => {
    readRepo.findByEstablishmentId.mockResolvedValue(null);
    writeRepo.createPrinterConfig.mockResolvedValue({
      establishmentId: 'establishment-1',
      deviceKey: 'generated-uuid-key',
    });

    const result = await handler.execute(new GenerateDeviceKeyCommand('establishment-1' as any));

    expect(result.deviceKey).toBe('generated-uuid-key');
    expect(writeRepo.createPrinterConfig).toHaveBeenCalledWith('establishment-1');
  });

  it('should rotate the key when a config already exists', async () => {
    readRepo.findByEstablishmentId.mockResolvedValue({ establishmentId: 'establishment-1', deviceKey: 'existing-key' });

    const result = await handler.execute(new GenerateDeviceKeyCommand('establishment-1' as any));

    expect(result.deviceKey).toBeDefined();
    expect(result.deviceKey).not.toBe('existing-key');
    expect(writeRepo.rotateDeviceKey).toHaveBeenCalledWith('establishment-1', result.deviceKey);
    expect(writeRepo.createPrinterConfig).not.toHaveBeenCalled();
  });

  it('should issue a different key on each rotation', async () => {
    readRepo.findByEstablishmentId.mockResolvedValue({ establishmentId: 'establishment-1', deviceKey: 'existing-key' });

    const first = await handler.execute(new GenerateDeviceKeyCommand('establishment-1' as any));
    const second = await handler.execute(new GenerateDeviceKeyCommand('establishment-1' as any));

    expect(first.deviceKey).not.toBe(second.deviceKey);
  });
});
