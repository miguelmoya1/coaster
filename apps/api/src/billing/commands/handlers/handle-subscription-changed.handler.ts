import { BarId } from '@coaster/common';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CommandHandler, EventBus, ICommandHandler } from '@nestjs/cqrs';
import { DbSubscriptionPlan, DbSubscriptionStatus } from '../../../core/db';
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

    const subAny = subscription as any;
    const firstItem = subscription.items.data[0];
    const isCanceled = subscription.status === 'canceled' || Boolean(subscription.cancel_at_period_end || subAny.cancel_at);
    const plan = isCanceled && subscription.status === 'canceled' ? DbSubscriptionPlan.FREE : toDbPlan(firstItem?.price?.id, this._configService);
    const status = isCanceled ? DbSubscriptionStatus.CANCELED : toDbStatus(subscription.status);

    const currentPeriodStart = subscription.status === 'canceled'
      ? null
      : subAny.current_period_start
        ? new Date(subAny.current_period_start * 1000)
        : firstItem?.current_period_start
          ? new Date(firstItem.current_period_start * 1000)
          : null;

    const currentPeriodEnd = subscription.status === 'canceled'
      ? null
      : (subAny.cancel_at || subAny.current_period_end)
        ? new Date((subAny.cancel_at || subAny.current_period_end) * 1000)
        : firstItem?.current_period_end
          ? new Date(firstItem.current_period_end * 1000)
          : null;

    this._logger.debug(
      `Updating subscription for barId=${barId}: subscriptionId=${subscription.id}, plan=${plan}, status=${status}`,
    );

    await this._writeRepo.upsertSubscriptionDetails(barId, {
      stripeCustomerId: customerId,
      stripeSubscriptionId: subscription.status === 'canceled' ? null : subscription.id,
      plan,
      status,
      currentPeriodStart,
      currentPeriodEnd,
      canceledAt: subscription.canceled_at ? new Date(subscription.canceled_at * 1000) : null,
    });

    const eventPeriodEnd = currentPeriodEnd ?? undefined;
    const canceledAt = subscription.canceled_at ? new Date(subscription.canceled_at * 1000) : undefined;

    if ((subscription.status === 'active' || subscription.status === 'trialing') && !isCanceled) {
      this._logger.debug(`Publishing SubscriptionRenewedEvent for barId=${barId}`);
      this._eventBus.publish(new SubscriptionRenewedEvent(barId, subscription.id, eventPeriodEnd));
    }

    if (isCanceled) {
      this._logger.debug(`Publishing SubscriptionCancelledEvent for barId=${barId}`);
      this._eventBus.publish(
        new SubscriptionCancelledEvent(barId, subscription.id, canceledAt),
      );
    }
  }
}
