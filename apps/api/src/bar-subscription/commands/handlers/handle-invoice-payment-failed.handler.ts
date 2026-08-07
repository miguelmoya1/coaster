import type { BarId } from '@coaster/common';
import { DbSubscriptionStatus } from '@coaster/core/db';
import { Injectable, Logger } from '@nestjs/common';
import { CommandHandler, EventBus, ICommandHandler } from '@nestjs/cqrs';
import { BarSubscriptionReadRepository } from '../../data-access/bar-subscription.read.repository';
import { BarSubscriptionWriteRepository } from '../../data-access/bar-subscription.write.repository';
import { SubscriptionPaymentFailedEvent } from '../../events';
import { HandleInvoicePaymentFailedCommand } from '../impl/handle-invoice-payment-failed.command';

@Injectable()
@CommandHandler(HandleInvoicePaymentFailedCommand)
export class HandleInvoicePaymentFailedHandler implements ICommandHandler<HandleInvoicePaymentFailedCommand, void> {
  private readonly _logger = new Logger(HandleInvoicePaymentFailedHandler.name);

  constructor(
    private readonly _readRepo: BarSubscriptionReadRepository,
    private readonly _writeRepo: BarSubscriptionWriteRepository,
    private readonly _eventBus: EventBus,
  ) {}

  async execute(command: HandleInvoicePaymentFailedCommand): Promise<void> {
    const { invoice } = command;

    const stripeCustomerId = typeof invoice.customer === 'string' ? invoice.customer : (invoice.customer?.id ?? null);
    const rawSubscription = invoice.parent?.subscription_details?.subscription;
    const stripeSubscriptionId = typeof rawSubscription === 'string' ? rawSubscription : (rawSubscription?.id ?? null);

    if (!stripeCustomerId && !stripeSubscriptionId) {
      this._logger.warn(
        `Invoice payment failed event ignored: missing customerId and subscriptionId for ${invoice.id}`,
      );
      return;
    }

    this._logger.debug(
      `Handling failed invoice payment for invoiceId=${invoice.id}, customerId=${stripeCustomerId}, subscriptionId=${stripeSubscriptionId}`,
    );

    const existing = stripeSubscriptionId
      ? await this._readRepo.findByStripeSubscriptionId(stripeSubscriptionId)
      : await this._readRepo.findByStripeCustomerId(stripeCustomerId!);

    if (!existing) {
      this._logger.debug(
        `Invoice payment failed event ignored: no BarSubscription found for customerId=${stripeCustomerId}, subscriptionId=${stripeSubscriptionId}`,
      );
      return;
    }

    this._logger.debug(`Marking subscription past due for barId=${existing.barId}`);
    await this._writeRepo.update(existing.barId as BarId, { status: DbSubscriptionStatus.PAST_DUE });

    this._eventBus.publish(
      new SubscriptionPaymentFailedEvent(existing.barId as BarId, stripeCustomerId ?? existing.stripeCustomerId ?? ''),
    );
  }
}
