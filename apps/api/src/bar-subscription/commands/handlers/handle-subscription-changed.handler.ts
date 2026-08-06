import type { BarId } from '@coaster/common';
import { ErrorCodes } from '@coaster/common';
import { DbSubscriptionPlan, DbSubscriptionStatus } from '@coaster/core/db';
import { isLiveSubscription, StripeApi, toDbPlan, toDbStatus } from '@coaster/stripe';
import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CommandHandler, EventBus, ICommandHandler } from '@nestjs/cqrs';
import { BarSubscriptionReadRepository } from '../../data-access/bar-subscription.read.repository';
import { BarSubscriptionWriteRepository } from '../../data-access/bar-subscription.write.repository';
import { SubscriptionCancelledEvent, SubscriptionRenewedEvent } from '../../events';
import { HandleSubscriptionChangedCommand } from '../impl/handle-subscription-changed.command';

@Injectable()
@CommandHandler(HandleSubscriptionChangedCommand)
export class HandleSubscriptionChangedHandler implements ICommandHandler<HandleSubscriptionChangedCommand, void> {
  private readonly _logger = new Logger(HandleSubscriptionChangedHandler.name);

  constructor(
    private readonly _readRepo: BarSubscriptionReadRepository,
    private readonly _writeRepo: BarSubscriptionWriteRepository,
    private readonly _configService: ConfigService,
    private readonly _eventBus: EventBus,
    private readonly _stripeApi: StripeApi,
  ) {}

  async execute(command: HandleSubscriptionChangedCommand): Promise<void> {
    const { subscription } = command;

    const stripeCustomerId =
      typeof subscription.customer === 'string' ? subscription.customer : (subscription.customer?.id ?? null);

    if (!stripeCustomerId) {
      this._logger.error(`Cannot process subscription ${subscription.id}: customerId missing`);
      throw new InternalServerErrorException(ErrorCodes.STRIPE_WEBHOOK_CUSTOMER_MISSING);
    }

    const existing =
      (await this._readRepo.findByStripeSubscriptionId(subscription.id)) ??
      (await this._readRepo.findByStripeCustomerId(stripeCustomerId));
    const barId = (existing?.barId || subscription.metadata?.barId) as BarId | undefined;

    if (!barId) {
      this._logger.error(`Cannot process subscription ${subscription.id}: barId missing`);
      throw new InternalServerErrorException(ErrorCodes.STRIPE_WEBHOOK_BAR_ID_MISSING);
    }

    const trackedSubscriptionId = existing?.stripeSubscriptionId;

    if (trackedSubscriptionId && trackedSubscriptionId !== subscription.id) {
      const tracked = await this._stripeApi.retrieveSubscription(trackedSubscriptionId);

      if (tracked && isLiveSubscription(tracked.status)) {
        this._logger.warn(
          `Ignoring event for untracked subscription ${subscription.id} on barId=${barId}: ${trackedSubscriptionId} is the live one`,
        );
        return;
      }
    }

    const firstItem = subscription.items.data[0];
    const isTerminalCancellation = subscription.status === 'canceled';
    const isScheduledCancellation = Boolean(subscription.cancel_at_period_end || subscription.cancel_at);
    const isCancellation = isTerminalCancellation || isScheduledCancellation;

    const plan = isTerminalCancellation ? DbSubscriptionPlan.FREE : toDbPlan(firstItem?.price?.id, this._configService);
    const status = isCancellation ? DbSubscriptionStatus.CANCELED : toDbStatus(subscription.status);

    const currentPeriodStart = firstItem?.current_period_start ? new Date(firstItem.current_period_start * 1000) : null;
    const currentPeriodEnd = subscription.cancel_at
      ? new Date(subscription.cancel_at * 1000)
      : firstItem?.current_period_end
        ? new Date(firstItem.current_period_end * 1000)
        : null;
    const trialEndsAt = subscription.trial_end ? new Date(subscription.trial_end * 1000) : null;
    const canceledAt = subscription.canceled_at ? new Date(subscription.canceled_at * 1000) : null;

    this._logger.debug(
      `Updating subscription for barId=${barId}: subscriptionId=${subscription.id}, plan=${plan}, status=${status}`,
    );

    const data = {
      stripeCustomerId,
      stripeSubscriptionId: isTerminalCancellation ? null : subscription.id,
      plan,
      status,
      currentPeriodStart,
      currentPeriodEnd,
      trialEndsAt,
      canceledAt,
    };

    await this._writeRepo.upsert(barId, data, data);

    if (isCancellation) {
      this._logger.debug(`Publishing SubscriptionCancelledEvent for barId=${barId}`);
      this._eventBus.publish(new SubscriptionCancelledEvent(barId, subscription.id, canceledAt ?? undefined));
      return;
    }

    if (subscription.status === 'active' || subscription.status === 'trialing') {
      this._logger.debug(`Publishing SubscriptionRenewedEvent for barId=${barId}`);
      this._eventBus.publish(new SubscriptionRenewedEvent(barId, subscription.id, currentPeriodEnd ?? undefined));
    }
  }
}
