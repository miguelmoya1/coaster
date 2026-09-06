import { StripeApi } from '@coaster/stripe';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { EstablishmentSubscriptionReadRepository } from '../../data-access/establishment-subscription.read.repository';
import { SyncSubscriptionSeatsCommand } from '../impl/sync-subscription-seats.command';

@Injectable()
@CommandHandler(SyncSubscriptionSeatsCommand)
export class SyncSubscriptionSeatsHandler implements ICommandHandler<SyncSubscriptionSeatsCommand, void> {
  readonly #logger = new Logger(SyncSubscriptionSeatsHandler.name);

  constructor(
    private readonly _readRepo: EstablishmentSubscriptionReadRepository,
    private readonly _configService: ConfigService,
    private readonly _stripeApi: StripeApi,
  ) {}

  async execute(command: SyncSubscriptionSeatsCommand): Promise<void> {
    const { establishmentId } = command;
    const subscription = await this._readRepo.findByEstablishmentId(establishmentId);

    if (!subscription?.stripeSubscriptionId) {
      this.#logger.debug(`No Stripe subscription for establishmentId=${establishmentId}: nothing to bill by seat`);
      return;
    }

    const seats = await this._readRepo.countBillableSeats(establishmentId);

    if (seats === subscription.seats) {
      return;
    }

    const priceId = this._configService.get<string>('STRIPE_PRICE_PRO');

    if (!priceId) {
      this.#logger.error(`STRIPE_PRICE_PRO is not configured: establishmentId=${establishmentId} keeps ${subscription.seats} seats`);
      return;
    }

    this.#logger.debug(
      `Moving establishmentId=${establishmentId} from ${subscription.seats} to ${seats} seats on ${subscription.stripeSubscriptionId}`,
    );

    await this._stripeApi.updateSubscriptionSeats(subscription.stripeSubscriptionId, seats, priceId);
  }
}
