import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { PrinterPairingRepository } from '../../data-access/printer-pairing.repository';
import { IssuePairingCommand } from '../impl/issue-pairing.command';

@CommandHandler(IssuePairingCommand)
export class IssuePairingHandler implements ICommandHandler<IssuePairingCommand, { code: string }> {
  constructor(private readonly _pairings: PrinterPairingRepository) {}

  async execute(command: IssuePairingCommand): Promise<{ code: string }> {
    return { code: await this._pairings.issue(command.establishmentId) };
  }
}
