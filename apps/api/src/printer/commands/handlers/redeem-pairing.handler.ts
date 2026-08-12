import type { EstablishmentId, PrinterPairingResult } from '@coaster/common';
import { ErrorCodes } from '@coaster/common';
import { NotFoundException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { PrinterPairingRepository } from '../../data-access/printer-pairing.repository';
import { PrinterReadRepository } from '../../data-access/printer.read.repository';
import { PrinterWriteRepository } from '../../data-access/printer.write.repository';
import { RedeemPairingCommand } from '../impl/redeem-pairing.command';

@CommandHandler(RedeemPairingCommand)
export class RedeemPairingHandler implements ICommandHandler<RedeemPairingCommand, PrinterPairingResult> {
  constructor(
    private readonly _pairings: PrinterPairingRepository,
    private readonly _readRepo: PrinterReadRepository,
    private readonly _writeRepo: PrinterWriteRepository,
  ) {}

  async execute(command: RedeemPairingCommand): Promise<PrinterPairingResult> {
    const pairing = await this._pairings.redeem(command.code.trim().toUpperCase());

    if (!pairing) {
      throw new NotFoundException(ErrorCodes.PRINTER_PAIRING_INVALID);
    }

    const establishmentId = pairing.establishmentId as EstablishmentId;

    const config =
      (await this._readRepo.findByEstablishmentId(establishmentId)) ??
      (await this._writeRepo.createPrinterConfig(establishmentId));

    return { establishmentId, deviceKey: config.deviceKey };
  }
}
