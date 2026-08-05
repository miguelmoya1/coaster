import { Injectable, Logger } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { HandleSubscriptionChangedCommand } from '../impl/handle-subscription-changed.command';

@Injectable()
@CommandHandler(HandleSubscriptionChangedCommand)
export class HandleSubscriptionChangedHandler implements ICommandHandler<HandleSubscriptionChangedCommand, void> {
  private readonly _logger = new Logger(HandleSubscriptionChangedHandler.name);

  async execute(command: HandleSubscriptionChangedCommand): Promise<void> {
    const { subscription } = command;
    this._logger.debug(`Handling subscription changed for subscription: ${subscription.id}`);
  }
}
