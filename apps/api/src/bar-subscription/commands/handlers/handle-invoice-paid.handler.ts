import { Injectable, Logger } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { HandleInvoicePaidCommand } from '../impl/handle-invoice-paid.command';

@Injectable()
@CommandHandler(HandleInvoicePaidCommand)
export class HandleInvoicePaidHandler implements ICommandHandler<HandleInvoicePaidCommand, void> {
  private readonly _logger = new Logger(HandleInvoicePaidHandler.name);

  async execute(command: HandleInvoicePaidCommand): Promise<void> {
    const { invoice } = command;
    this._logger.debug(`Handling invoice paid for invoice: ${invoice.id}`);
  }
}
