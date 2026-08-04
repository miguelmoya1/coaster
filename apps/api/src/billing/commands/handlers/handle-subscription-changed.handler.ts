import { BarId, ErrorCodes } from '@coaster/common';
import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CommandHandler, EventBus, ICommandHandler } from '@nestjs/cqrs';
import Stripe from 'stripe';
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
      this._logger.error(`Cannot process subscription ${subscription.id}: customerId missing`);
      throw new InternalServerErrorException(ErrorCodes.STRIPE_WEBHOOK_CUSTOMER_MISSING);
    }

    const existing = await this._readRepo.findSubscriptionByStripeIds(subscription.id, customerId);
    const barId = (existing?.barId || subscription.metadata?.barId) as BarId | undefined;

    if (!barId) {
      this._logger.error(`Cannot process subscription ${subscription.id}: barId missing`);
      throw new InternalServerErrorException(ErrorCodes.STRIPE_WEBHOOK_BAR_ID_MISSING);
    }

    const subAny = subscription as Stripe.Subscription & {
      cancel_at?: number | null;
      current_period_start?: number | null;
      current_period_end?: number | null;
    };
    const firstItem = subscription.items.data[0];
    const isTerminalCancellation = subscription.status === 'canceled';
    const isScheduledCancellation = Boolean(subscription.cancel_at_period_end || subAny.cancel_at);
    const isCancellation = isTerminalCancellation || isScheduledCancellation;
    const plan = isTerminalCancellation ? DbSubscriptionPlan.FREE : toDbPlan(firstItem?.price?.id, this._configService);
    const status = isCancellation ? DbSubscriptionStatus.CANCELED : toDbStatus(subscription.status);

    const currentPeriodStart = subAny.current_period_start
      ? new Date(subAny.current_period_start * 1000)
      : firstItem?.current_period_start
        ? new Date(firstItem.current_period_start * 1000)
        : null;

    const currentPeriodEnd =
      subAny.cancel_at || subAny.current_period_end
        ? new Date((subAny.cancel_at || subAny.current_period_end)! * 1000)
        : firstItem?.current_period_end
          ? new Date(firstItem.current_period_end * 1000)
          : null;

    const trialEndsAt = subscription.trial_end ? new Date(subscription.trial_end * 1000) : null;

    this._logger.debug(
      `Updating subscription for barId=${barId}: subscriptionId=${subscription.id}, plan=${plan}, status=${status}`,
    );

    await this._writeRepo.upsertSubscriptionDetails(barId, {
      stripeCustomerId: customerId,
      stripeSubscriptionId: isTerminalCancellation ? null : subscription.id,
      plan,
      status,
      currentPeriodStart,
      currentPeriodEnd,
      trialEndsAt,
      canceledAt: subscription.canceled_at ? new Date(subscription.canceled_at * 1000) : null,
    });

    const eventPeriodEnd = currentPeriodEnd ?? undefined;
    const canceledAt = subscription.canceled_at ? new Date(subscription.canceled_at * 1000) : undefined;

    if ((subscription.status === 'active' || subscription.status === 'trialing') && !isCancellation) {
      this._logger.debug(`Publishing SubscriptionRenewedEvent for barId=${barId}`);
      this._eventBus.publish(new SubscriptionRenewedEvent(barId, subscription.id, eventPeriodEnd));
    }

    if (isCancellation) {
      this._logger.debug(`Publishing SubscriptionCancelledEvent for barId=${barId}`);
      this._eventBus.publish(new SubscriptionCancelledEvent(barId, subscription.id, canceledAt));
    }
  }
}
