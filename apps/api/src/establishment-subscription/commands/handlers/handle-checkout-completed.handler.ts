import type { EstablishmentId } from '@coaster/common';
import { ErrorCodes } from '@coaster/common';
import { DbSubscriptionPlan, DbSubscriptionStatus } from '@coaster/core/db';
import { isLiveSubscription, StripeApi, toSubscriptionSnapshot } from '@coaster/stripe';
import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CommandHandler, EventBus, ICommandHandler } from '@nestjs/cqrs';
import { EstablishmentSubscriptionReadRepository } from '../../data-access/establishment-subscription.read.repository';
import { EstablishmentSubscriptionWriteRepository } from '../../data-access/establishment-subscription.write.repository';
import { DuplicateSubscriptionDetectedEvent } from '../../events';
import { HandleCheckoutCompletedCommand } from '../impl/handle-checkout-completed.command';

@Injectable()
@CommandHandler(HandleCheckoutCompletedCommand)
export class HandleCheckoutCompletedHandler implements ICommandHandler<HandleCheckoutCompletedCommand, void> {
  private readonly _logger = new Logger(HandleCheckoutCompletedHandler.name);

  constructor(
    private readonly _writeRepo: EstablishmentSubscriptionWriteRepository,
    private readonly _readRepo: EstablishmentSubscriptionReadRepository,
    private readonly _stripeApi: StripeApi,
    private readonly _eventBus: EventBus,
    private readonly _configService: ConfigService,
  ) {}

  async execute(command: HandleCheckoutCompletedCommand): Promise<void> {
    const { session } = command;

    if (session.mode !== 'subscription') {
      this._logger.debug(`Ignoring checkout session ${session.id}: mode is not 'subscription' (${session.mode})`);
      return;
    }

    const establishmentId = (session.metadata?.establishmentId || session.client_reference_id) as
      EstablishmentId | undefined;
    const stripeCustomerId = typeof session.customer === 'string' ? session.customer : (session.customer?.id ?? null);
    const stripeSubscriptionId =
      typeof session.subscription === 'string' ? session.subscription : (session.subscription?.id ?? null);

    if (!establishmentId) {
      this._logger.error(`Cannot process checkout completion for session ${session.id}: establishmentId missing`);
      throw new InternalServerErrorException(ErrorCodes.STRIPE_WEBHOOK_ESTABLISHMENT_ID_MISSING);
    }

    if (!stripeCustomerId) {
      this._logger.error(`Cannot process checkout completion for session ${session.id}: customerId missing`);
      throw new InternalServerErrorException(ErrorCodes.STRIPE_WEBHOOK_CUSTOMER_MISSING);
    }

    if (!stripeSubscriptionId) {
      this._logger.error(`Cannot process checkout completion for session ${session.id}: subscriptionId missing`);
      throw new InternalServerErrorException(ErrorCodes.STRIPE_WEBHOOK_SUBSCRIPTION_MISSING);
    }

    if (await this.#isDuplicateOf(establishmentId, stripeSubscriptionId)) {
      return;
    }

    const data = await this.#resolveState(stripeCustomerId, stripeSubscriptionId);

    this._logger.debug(
      `Linking Stripe references for establishmentId=${establishmentId}: customerId=${stripeCustomerId}, subscriptionId=${stripeSubscriptionId}`,
    );

    await this._writeRepo.upsert(establishmentId, data, data);
  }

  /**
   * Reading the subscription back from Stripe rather than waiting for `customer.subscription.*` to
   * turn up: that event usually arrives, but "usually" here means an establishment that paid and stays locked
   * out until somebody notices. A live read also beats any webhook already processed, so writing
   * it cannot undo fresher state.
   */
  async #resolveState(stripeCustomerId: string, stripeSubscriptionId: string) {
    const subscription = await this._stripeApi.retrieveSubscription(stripeSubscriptionId);

    if (!subscription) {
      this._logger.warn(
        `Stripe does not know subscription ${stripeSubscriptionId} yet; linking it as inactive until an event says otherwise`,
      );

      return {
        plan: DbSubscriptionPlan.FREE,
        status: DbSubscriptionStatus.INACTIVE,
        stripeCustomerId,
        stripeSubscriptionId,
      };
    }

    const { isCancellation: _isCancellation, ...snapshot } = toSubscriptionSnapshot(subscription, this._configService);

    return {
      ...snapshot,
      stripeCustomerId,
      stripeSubscriptionId: snapshot.stripeSubscriptionId ?? stripeSubscriptionId,
    };
  }

  async #isDuplicateOf(establishmentId: EstablishmentId, incomingSubscriptionId: string): Promise<boolean> {
    const existing = await this._readRepo.findByEstablishmentId(establishmentId);
    const trackedSubscriptionId = existing?.stripeSubscriptionId;

    if (!trackedSubscriptionId || trackedSubscriptionId === incomingSubscriptionId) {
      return false;
    }

    const tracked = await this._stripeApi.retrieveSubscription(trackedSubscriptionId);

    if (!tracked || !isLiveSubscription(tracked.status)) {
      this._logger.debug(
        `Replacing dead subscription ${trackedSubscriptionId} on establishmentId=${establishmentId} with ${incomingSubscriptionId}`,
      );
      return false;
    }

    // The billing consequence is reported by whoever handles the event; this is just the action.
    this._logger.warn(
      `Cancelling duplicate subscription ${incomingSubscriptionId} on establishmentId=${establishmentId}, which already has the live ${trackedSubscriptionId}`,
    );

    await this._stripeApi.cancelSubscription(incomingSubscriptionId);
    this._eventBus.publish(
      new DuplicateSubscriptionDetectedEvent(establishmentId, trackedSubscriptionId, incomingSubscriptionId),
    );

    return true;
  }
}
