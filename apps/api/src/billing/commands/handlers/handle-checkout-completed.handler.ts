import { BarId, ErrorCodes } from '@coaster/common';
import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
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
    const customerId = typeof session.customer === 'string' ? session.customer : (session.customer?.id ?? null);
    const stripeSubscriptionId =
      typeof session.subscription === 'string' ? session.subscription : (session.subscription?.id ?? null);

    if (!barId) {
      this._logger.error(`Cannot process checkout completion for session ${session.id}: barId missing`);
      throw new InternalServerErrorException(ErrorCodes.STRIPE_WEBHOOK_BAR_ID_MISSING);
    }

    if (!customerId) {
      this._logger.error(`Cannot process checkout completion for session ${session.id}: customerId missing`);
      throw new InternalServerErrorException(ErrorCodes.STRIPE_WEBHOOK_CUSTOMER_MISSING);
    }

    if (!stripeSubscriptionId) {
      this._logger.error(`Cannot process checkout completion for session ${session.id}: subscriptionId missing`);
      throw new InternalServerErrorException(ErrorCodes.STRIPE_WEBHOOK_SUBSCRIPTION_MISSING);
    }

    this._logger.debug(
      `Processing completed checkout session for barId=${barId}, customerId=${customerId}, subscriptionId=${stripeSubscriptionId}`,
    );
    await this._writeRepo.linkStripeReferences(barId, customerId, stripeSubscriptionId);
  }
}
