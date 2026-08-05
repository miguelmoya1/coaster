import { Injectable, Logger } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { HandleCheckoutCompletedCommand } from '../impl/handle-checkout-completed.command';

@Injectable()
@CommandHandler(HandleCheckoutCompletedCommand)
export class HandleCheckoutCompletedHandler implements ICommandHandler<HandleCheckoutCompletedCommand, void> {
  private readonly _logger = new Logger(HandleCheckoutCompletedHandler.name);

  async execute(command: HandleCheckoutCompletedCommand): Promise<void> {
    const { session } = command;
    this._logger.debug(`Handling checkout completed for session: ${session.id}`);
  }
}
