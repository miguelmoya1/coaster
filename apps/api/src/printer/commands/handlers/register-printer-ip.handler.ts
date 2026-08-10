import { Logger } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { PrinterWriteRepository } from '../../data-access/printer.write.repository';
import { DeviceKeyService } from '../../services/device-key.service';
import { RegisterPrinterIpCommand } from '../impl/register-printer-ip.command';

@CommandHandler(RegisterPrinterIpCommand)
export class RegisterPrinterIpHandler implements ICommandHandler<RegisterPrinterIpCommand, void> {
  readonly #logger = new Logger(RegisterPrinterIpHandler.name);

  constructor(
    private readonly writeRepo: PrinterWriteRepository,
    private readonly deviceKey: DeviceKeyService,
  ) {}

  async execute(command: RegisterPrinterIpCommand): Promise<void> {
    await this.deviceKey.authenticate(command.establishmentId, command.deviceKey);

    await this.writeRepo.upsertPrinterConfig(command.establishmentId, command.ipAddress, command.port);
    this.#logger.log(
      `Printer at ${command.ipAddress}:${command.port ?? 8080} registered for establishment ${command.establishmentId}`,
    );
  }
}
