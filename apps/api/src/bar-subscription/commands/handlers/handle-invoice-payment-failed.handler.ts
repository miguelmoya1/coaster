import { Injectable, Logger } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { HandleInvoicePaymentFailedCommand } from '../impl/handle-invoice-payment-failed.command';

@Injectable()
@CommandHandler(HandleInvoicePaymentFailedCommand)
export class HandleInvoicePaymentFailedHandler implements ICommandHandler<HandleInvoicePaymentFailedCommand, void> {
  private readonly _logger = new Logger(HandleInvoicePaymentFailedHandler.name);

  async execute(command: HandleInvoicePaymentFailedCommand): Promise<void> {
    const { invoice } = command;
    this._logger.debug(`Handling invoice payment failed for invoice: ${invoice.id}`);
  }
}
