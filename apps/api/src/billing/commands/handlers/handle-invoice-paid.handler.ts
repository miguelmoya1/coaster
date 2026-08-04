import { BarId } from '@coaster/common';
import { Injectable, Logger } from '@nestjs/common';
import { CommandHandler, EventBus, ICommandHandler } from '@nestjs/cqrs';
import { BillingReadRepository } from '../../data-access/billing.read.repository';
import { BillingWriteRepository } from '../../data-access/billing.write.repository';
import { SubscriptionRenewedEvent } from '../../events';
import { HandleInvoicePaidCommand } from '../impl/handle-invoice-paid.command';

@Injectable()
@CommandHandler(HandleInvoicePaidCommand)
export class HandleInvoicePaidHandler implements ICommandHandler<HandleInvoicePaidCommand, void> {
  private readonly _logger = new Logger(HandleInvoicePaidHandler.name);

  constructor(
    private readonly _readRepo: BillingReadRepository,
    private readonly _writeRepo: BillingWriteRepository,
    private readonly _eventBus: EventBus,
  ) {}

  async execute(command: HandleInvoicePaidCommand): Promise<void> {
    const { invoice } = command;
    const customerId = typeof invoice.customer === 'string' ? invoice.customer : (invoice.customer?.id ?? null);
    const rawSubscription = invoice.parent?.subscription_details?.subscription;
    const subscriptionId = typeof rawSubscription === 'string' ? rawSubscription : (rawSubscription?.id ?? null);

    if (!customerId && !subscriptionId) {
      this._logger.debug(`Invoice paid event ignored: missing customerId and subscriptionId for ${invoice.id}`);
      return;
    }

    const affectedSubscriptions = await this._readRepo.findSubscriptionsByStripeIds(subscriptionId, customerId);
    await this._writeRepo.markSubscriptionsPaid(subscriptionId, customerId);

    for (const subscription of affectedSubscriptions) {
      this._eventBus.publish(
        new SubscriptionRenewedEvent(subscription.barId as BarId, subscriptionId ?? '', undefined),
      );
    }
  }
}
