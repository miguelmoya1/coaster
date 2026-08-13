import type { EstablishmentId } from '@coaster/common';
import { ErrorCodes } from '@coaster/common';
import { isLiveSubscription, StripeApi, toSubscriptionSnapshot } from '@coaster/stripe';
import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CommandHandler, EventBus, ICommandHandler } from '@nestjs/cqrs';
import { EstablishmentSubscriptionReadRepository } from '../../data-access/establishment-subscription.read.repository';
import { EstablishmentSubscriptionWriteRepository } from '../../data-access/establishment-subscription.write.repository';
import { SubscriptionCancelledEvent, SubscriptionRenewedEvent } from '../../events';
import { HandleSubscriptionChangedCommand } from '../impl/handle-subscription-changed.command';

@Injectable()
@CommandHandler(HandleSubscriptionChangedCommand)
export class HandleSubscriptionChangedHandler implements ICommandHandler<HandleSubscriptionChangedCommand, void> {
  private readonly _logger = new Logger(HandleSubscriptionChangedHandler.name);

  constructor(
    private readonly _readRepo: EstablishmentSubscriptionReadRepository,
    private readonly _writeRepo: EstablishmentSubscriptionWriteRepository,
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
    const establishmentId = (existing?.establishmentId || subscription.metadata?.establishmentId) as
      EstablishmentId | undefined;

    if (!establishmentId) {
      this._logger.debug(
        `Subscription ${subscription.id} ignored: it belongs to no establishment of this platform, so there is nothing to project`,
      );
      return;
    }

    const trackedSubscriptionId = existing?.stripeSubscriptionId;

    if (trackedSubscriptionId && trackedSubscriptionId !== subscription.id) {
      const tracked = await this._stripeApi.retrieveSubscription(trackedSubscriptionId);

      if (tracked && isLiveSubscription(tracked.status)) {
        this._logger.warn(
          `Ignoring event for untracked subscription ${subscription.id} on establishmentId=${establishmentId}: ${trackedSubscriptionId} is the live one`,
        );
        return;
      }
    }

    const { isCancellation, ...snapshot } = toSubscriptionSnapshot(subscription, this._configService);
    const { currentPeriodEnd, canceledAt } = snapshot;

    this._logger.debug(
      `Updating subscription for establishmentId=${establishmentId}: subscriptionId=${subscription.id}, plan=${snapshot.plan}, status=${snapshot.status}`,
    );

    const data = { ...snapshot, stripeCustomerId };

    await this._writeRepo.upsert(establishmentId, data, data);

    if (isCancellation) {
      this._logger.debug(`Publishing SubscriptionCancelledEvent for establishmentId=${establishmentId}`);
      this._eventBus.publish(new SubscriptionCancelledEvent(establishmentId, subscription.id, canceledAt ?? undefined));
      return;
    }

    if (subscription.status === 'active' || subscription.status === 'trialing') {
      this._logger.debug(`Publishing SubscriptionRenewedEvent for establishmentId=${establishmentId}`);
      this._eventBus.publish(
        new SubscriptionRenewedEvent(establishmentId, subscription.id, currentPeriodEnd ?? undefined),
      );
    }
  }
}
