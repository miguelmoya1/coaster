import { BarId } from '@coaster/common';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CommandHandler, EventBus, ICommandHandler } from '@nestjs/cqrs';
import { toDbPlan, toDbStatus } from '../../../stripe';
import { BillingReadRepository } from '../../data-access/billing.read.repository';
import { BillingWriteRepository } from '../../data-access/billing.write.repository';
import { SubscriptionCancelledEvent, SubscriptionRenewedEvent } from '../../events';
import { HandleSubscriptionChangedCommand } from '../impl/handle-subscription-changed.command';

@Injectable()
@CommandHandler(HandleSubscriptionChangedCommand)
export class HandleSubscriptionChangedHandler implements ICommandHandler<HandleSubscriptionChangedCommand, void> {
  private readonly _logger = new Logger(HandleSubscriptionChangedHandler.name);

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
      this._logger.warn(`Subscription changed event ignored: customerId missing in subscription ${subscription.id}`);
      return;
    }

    const existing = await this._readRepo.findSubscriptionByStripeIds(subscription.id, customerId);
    const barId = (existing?.barId || subscription.metadata?.barId) as BarId | undefined;

    if (!barId) {
      this._logger.warn(`Subscription changed event ignored: Could not resolve barId for subscription ${subscription.id}`);
      return;
    }

    const firstItem = subscription.items.data[0];
    const currentPeriodStart = firstItem?.current_period_start ? new Date(firstItem.current_period_start * 1000) : null;
    const currentPeriodEnd = firstItem?.current_period_end ? new Date(firstItem.current_period_end * 1000) : null;
    const plan = toDbPlan(firstItem?.price?.id, this._configService);
    const status = toDbStatus(subscription.status);

    this._logger.debug(
      `Updating subscription for barId=${barId}: subscriptionId=${subscription.id}, plan=${plan}, status=${status}`,
    );

    await this._writeRepo.upsertSubscriptionDetails(barId, {
      stripeCustomerId: customerId,
      stripeSubscriptionId: subscription.id,
      plan,
      status,
      currentPeriodStart,
      currentPeriodEnd,
      cancelAtPeriodEnd: subscription.cancel_at_period_end,
      canceledAt: subscription.canceled_at ? new Date(subscription.canceled_at * 1000) : null,
    });

    const eventPeriodEnd = currentPeriodEnd ?? undefined;
    const canceledAt = subscription.canceled_at ? new Date(subscription.canceled_at * 1000) : undefined;

    if (subscription.status === 'active' || subscription.status === 'trialing') {
      this._logger.debug(`Publishing SubscriptionRenewedEvent for barId=${barId}`);
      this._eventBus.publish(new SubscriptionRenewedEvent(barId, subscription.id, eventPeriodEnd));
    }

    if (subscription.status === 'canceled' || subscription.cancel_at_period_end) {
      this._logger.debug(`Publishing SubscriptionCancelledEvent for barId=${barId}`);
      this._eventBus.publish(
        new SubscriptionCancelledEvent(barId, subscription.id, subscription.cancel_at_period_end, canceledAt),
      );
    }
  }
}
