import type { BarId } from '@coaster/common';
import { ErrorCodes } from '@coaster/common';
import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { DbSubscriptionPlan, DbSubscriptionStatus } from '../../../core/db';
import { BarSubscriptionWriteRepository } from '../../data-access/bar-subscription.write.repository';
import { HandleCheckoutCompletedCommand } from '../impl/handle-checkout-completed.command';

@Injectable()
@CommandHandler(HandleCheckoutCompletedCommand)
export class HandleCheckoutCompletedHandler implements ICommandHandler<HandleCheckoutCompletedCommand, void> {
  private readonly _logger = new Logger(HandleCheckoutCompletedHandler.name);

  constructor(private readonly _writeRepo: BarSubscriptionWriteRepository) {}

  async execute(command: HandleCheckoutCompletedCommand): Promise<void> {
    const { session } = command;

    if (session.mode !== 'subscription') {
      this._logger.debug(`Ignoring checkout session ${session.id}: mode is not 'subscription' (${session.mode})`);
      return;
    }

    const barId = (session.metadata?.barId || session.client_reference_id) as BarId | undefined;
    const stripeCustomerId = typeof session.customer === 'string' ? session.customer : (session.customer?.id ?? null);
    const stripeSubscriptionId =
      typeof session.subscription === 'string' ? session.subscription : (session.subscription?.id ?? null);

    if (!barId) {
      this._logger.error(`Cannot process checkout completion for session ${session.id}: barId missing`);
      throw new InternalServerErrorException(ErrorCodes.STRIPE_WEBHOOK_BAR_ID_MISSING);
    }

    if (!stripeCustomerId) {
      this._logger.error(`Cannot process checkout completion for session ${session.id}: customerId missing`);
      throw new InternalServerErrorException(ErrorCodes.STRIPE_WEBHOOK_CUSTOMER_MISSING);
    }

    if (!stripeSubscriptionId) {
      this._logger.error(`Cannot process checkout completion for session ${session.id}: subscriptionId missing`);
      throw new InternalServerErrorException(ErrorCodes.STRIPE_WEBHOOK_SUBSCRIPTION_MISSING);
    }

    this._logger.debug(
      `Linking Stripe references for barId=${barId}: customerId=${stripeCustomerId}, subscriptionId=${stripeSubscriptionId}`,
    );

    await this._writeRepo.upsert(
      barId,
      {
        plan: DbSubscriptionPlan.FREE,
        status: DbSubscriptionStatus.INACTIVE,
        stripeCustomerId,
        stripeSubscriptionId,
      },
      { stripeCustomerId, stripeSubscriptionId },
    );
  }
}
