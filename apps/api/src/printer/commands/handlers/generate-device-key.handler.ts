import type { GenerateDeviceKeyResponseDto } from '@coaster/common';
import { ErrorCodes } from '@coaster/common';
import { ConflictException, Logger } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
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
    this.#logger.debug(`Generating device key for bar ${command.barId}...`);

    const existing = await this.readRepo.findByBarId(command.barId);
    if (existing) {
      throw new ConflictException(ErrorCodes.PRINTER_ALREADY_CONFIGURED);
    }

    const config = await this.writeRepo.createPrinterConfig(command.barId);

    this.#logger.log(`Device key generated for bar ${command.barId}`);

    return { deviceKey: config.deviceKey };
  }
}
