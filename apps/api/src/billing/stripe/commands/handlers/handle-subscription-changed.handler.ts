import { BarId } from '@coaster/common';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CommandHandler, EventBus, ICommandHandler } from '@nestjs/cqrs';
import { BillingReadRepository } from '../../../data-access/billing.read.repository';
import { BillingWriteRepository } from '../../../data-access/billing.write.repository';
import { SubscriptionCancelledEvent, SubscriptionRenewedEvent } from '../../../events';
import { toDbPlan, toDbStatus } from '../../utils/stripe.utils';
import { HandleSubscriptionChangedCommand } from '../impl/handle-subscription-changed.command';

@Injectable()
@CommandHandler(HandleSubscriptionChangedCommand)
export class HandleSubscriptionChangedHandler implements ICommandHandler<HandleSubscriptionChangedCommand, void> {
  constructor(
    private readonly _readRepo: BillingReadRepository,
    private readonly _writeRepo: BillingWriteRepository,
    private readonly _configService: ConfigService,
    private readonly _eventBus: EventBus,
  ) {}

  async execute(command: HandleSubscriptionChangedCommand): Promise<void> {
    const { subscription } = command;

    const customerId =
      typeof subscription.customer === 'string' ? subscription.customer : (subscription.customer?.id ?? null);

    if (!customerId) {
      return;
    }

    const existing = await this._readRepo.findSubscriptionByStripeIds(subscription.id, customerId);
    const barId = (existing?.barId || subscription.metadata?.barId) as BarId | undefined;

    if (!barId) {
      return;
    }

    const firstItem = subscription.items.data[0];

    const currentPeriodStart = firstItem?.current_period_start ? new Date(firstItem.current_period_start * 1000) : null;
    const currentPeriodEnd = firstItem?.current_period_end ? new Date(firstItem.current_period_end * 1000) : null;

    await this._writeRepo.upsertSubscriptionDetails(barId, {
      stripeCustomerId: customerId,
      stripeSubscriptionId: subscription.id,
      plan: toDbPlan(firstItem?.price?.id, this._configService),
      status: toDbStatus(subscription.status),
      currentPeriodStart,
      currentPeriodEnd,
      cancelAtPeriodEnd: subscription.cancel_at_period_end,
      canceledAt: subscription.canceled_at ? new Date(subscription.canceled_at * 1000) : null,
    });

    const eventPeriodEnd = currentPeriodEnd ?? undefined;
    const canceledAt = subscription.canceled_at ? new Date(subscription.canceled_at * 1000) : undefined;

    if (subscription.status === 'active' || subscription.status === 'trialing') {
      this._eventBus.publish(new SubscriptionRenewedEvent(barId, subscription.id, eventPeriodEnd));
    }

    if (subscription.status === 'canceled' || subscription.cancel_at_period_end) {
      this._eventBus.publish(
        new SubscriptionCancelledEvent(barId, subscription.id, subscription.cancel_at_period_end, canceledAt),
      );
    }
  }
}
