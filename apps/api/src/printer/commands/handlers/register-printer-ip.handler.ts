import { ErrorCodes } from '@coaster/common';
import { ForbiddenException, Logger, NotFoundException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import * as crypto from 'crypto';
import { PrinterReadRepository } from '../../data-access/printer.read.repository';
import { PrinterWriteRepository } from '../../data-access/printer.write.repository';
import { RegisterPrinterIpCommand } from '../impl/register-printer-ip.command';

@CommandHandler(RegisterPrinterIpCommand)
export class RegisterPrinterIpHandler implements ICommandHandler<RegisterPrinterIpCommand, void> {
  readonly #logger = new Logger(RegisterPrinterIpHandler.name);

  constructor(
    private readonly readRepo: PrinterReadRepository,
    private readonly writeRepo: PrinterWriteRepository,
  ) {}

  async execute(command: RegisterPrinterIpCommand): Promise<void> {
    this.#logger.debug(`Registering printer IP for bar ${command.barId}...`);

    const printerConfig = await this.readRepo.findByBarId(command.barId);
    if (!printerConfig) {
      throw new NotFoundException(ErrorCodes.PRINTER_NOT_CONFIGURED);
    }

    const storedKeyBuffer = Buffer.from(printerConfig.deviceKey, 'utf8');
    const providedKeyBuffer = Buffer.from(command.deviceKey, 'utf8');

    if (
      storedKeyBuffer.length !== providedKeyBuffer.length ||
      !crypto.timingSafeEqual(storedKeyBuffer, providedKeyBuffer)
    ) {
      throw new ForbiddenException(ErrorCodes.PRINTER_INVALID_DEVICE_KEY);
    }

    await this.writeRepo.upsertPrinterConfig(command.barId, command.ipAddress);
    this.#logger.log(`Printer IP ${command.ipAddress} registered for bar ${command.barId}`);
  }
}
