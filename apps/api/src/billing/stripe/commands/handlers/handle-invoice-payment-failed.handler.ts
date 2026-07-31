import { BarId } from '@coaster/common';
import { Injectable } from '@nestjs/common';
import { CommandHandler, EventBus, ICommandHandler } from '@nestjs/cqrs';
import { BillingReadRepository } from '../../../data-access/billing.read.repository';
import { BillingWriteRepository } from '../../../data-access/billing.write.repository';
import { SubscriptionPaymentFailedEvent } from '../../../events';
import { HandleInvoicePaymentFailedCommand } from '../impl/handle-invoice-payment-failed.command';

@Injectable()
@CommandHandler(HandleInvoicePaymentFailedCommand)
export class HandleInvoicePaymentFailedHandler implements ICommandHandler<HandleInvoicePaymentFailedCommand, void> {
  constructor(
    private readonly _readRepo: BillingReadRepository,
    private readonly _writeRepo: BillingWriteRepository,
    private readonly _eventBus: EventBus,
  ) {}

  async execute(command: HandleInvoicePaymentFailedCommand): Promise<void> {
    const { invoice } = command;

    const customerId = typeof invoice.customer === 'string' ? invoice.customer : (invoice.customer?.id ?? null);
    const rawSub = invoice.parent?.subscription_details?.subscription;
    const subscriptionId = typeof rawSub === 'string' ? rawSub : (rawSub?.id ?? null);

    if (!customerId && !subscriptionId) {
      return;
    }

    const affectedSubscriptions = await this._readRepo.findSubscriptionsByStripeIds(subscriptionId, customerId);

    await this._writeRepo.updateManySubscriptionsStatusToPastDue(subscriptionId, customerId);

    for (const subscription of affectedSubscriptions) {
      this._eventBus.publish(new SubscriptionPaymentFailedEvent(subscription.barId as BarId, customerId ?? ''));
    }
  }
}
