import type { GenerateDeviceKeyResponseDto } from '@coaster/common';
import { Logger } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { randomUUID } from 'crypto';
import { PrinterReadRepository } from '../../data-access/printer.read.repository';
import { PrinterWriteRepository } from '../../data-access/printer.write.repository';
import { GenerateDeviceKeyCommand } from '../impl/generate-device-key.command';

@CommandHandler(GenerateDeviceKeyCommand)
export class GenerateDeviceKeyHandler implements ICommandHandler<
  GenerateDeviceKeyCommand,
  GenerateDeviceKeyResponseDto
> {
  readonly #logger = new Logger(GenerateDeviceKeyHandler.name);

  constructor(
    private readonly readRepo: PrinterReadRepository,
    private readonly writeRepo: PrinterWriteRepository,
  ) {}

  async execute(command: GenerateDeviceKeyCommand): Promise<GenerateDeviceKeyResponseDto> {
    const existing = await this.readRepo.findByBarId(command.barId);

    if (!existing) {
      const config = await this.writeRepo.createPrinterConfig(command.barId);
      this.#logger.log(`Device key issued for bar ${command.barId}`);
      return { deviceKey: config.deviceKey };
    }

    const deviceKey = randomUUID();
    await this.writeRepo.rotateDeviceKey(command.barId, deviceKey);
    this.#logger.log(`Device key rotated for bar ${command.barId}; the previous key no longer works`);

    return { deviceKey };
  }
}
