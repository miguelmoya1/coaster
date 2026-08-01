import { BarId } from '@coaster/common';
import { Injectable, Logger } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { BillingWriteRepository } from '../../data-access/billing.write.repository';
import { HandleCheckoutCompletedCommand } from '../impl/handle-checkout-completed.command';

@Injectable()
@CommandHandler(HandleCheckoutCompletedCommand)
export class HandleCheckoutCompletedHandler implements ICommandHandler<HandleCheckoutCompletedCommand, void> {
  private readonly _logger = new Logger(HandleCheckoutCompletedHandler.name);

  constructor(private readonly _writeRepo: BillingWriteRepository) {}

  async execute(command: HandleCheckoutCompletedCommand): Promise<void> {
    const { session } = command;

    if (session.mode !== 'subscription') {
      this._logger.debug(`Ignoring checkout session ${session.id}: mode is not 'subscription' (${session.mode})`);
      return;
    }

    const barId = (session.metadata?.barId || session.client_reference_id) as BarId | undefined;
    const customerId = typeof session.customer === 'string' ? session.customer : null;
    const stripeSubscriptionId = typeof session.subscription === 'string' ? session.subscription : null;

    if (!barId || !customerId) {
      this._logger.warn(`Cannot process checkout completion for session ${session.id}: barId or customerId missing`);
      return;
    }

    this._logger.debug(`Processing completed checkout session for barId=${barId}, customerId=${customerId}, subscriptionId=${stripeSubscriptionId}`);
    await this._writeRepo.upsertBarCustomerId(barId, customerId, stripeSubscriptionId);
  }
}
