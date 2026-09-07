import type { EstablishmentSubscription } from '@coaster/common';
import { Logger } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { EstablishmentSubscriptionReadRepository } from '../../data-access/establishment-subscription.read.repository';
import { EstablishmentSubscriptionMapper } from '../../mappers/establishment-subscription.mapper';
import { StripeSubscriptionRefresher } from '../../services/stripe-subscription-refresher';
import { FindEstablishmentSubscriptionQuery } from '../impl/find-establishment-subscription.query';

@QueryHandler(FindEstablishmentSubscriptionQuery)
export class FindEstablishmentSubscriptionHandler implements IQueryHandler<
  FindEstablishmentSubscriptionQuery,
  EstablishmentSubscription
> {
  private readonly _logger = new Logger(FindEstablishmentSubscriptionHandler.name);

  constructor(
    private readonly _readRepo: EstablishmentSubscriptionReadRepository,
    private readonly _refresher: StripeSubscriptionRefresher,
  ) {}

  async execute(query: FindEstablishmentSubscriptionQuery): Promise<EstablishmentSubscription> {
    const { establishmentId } = query;
    let subscription = await this._readRepo.findByEstablishmentId(establishmentId);

    if (!subscription) {
      this._logger.debug(
        `No subscription stored for establishmentId=${establishmentId}, returning the default FREE plan`,
      );
      return EstablishmentSubscriptionMapper.toFreeDefault(establishmentId);
    }

    // Lo mismo que hace SubscriptionActiveGuard antes de negar una escritura, pero al leer:
    // si no, la pantalla enseñaría un local bloqueado que en realidad sí deja trabajar.
    if (this.#looksLapsed(subscription)) {
      await this._refresher.refresh(establishmentId);
      subscription = (await this._readRepo.findByEstablishmentId(establishmentId)) ?? subscription;
    }

    return EstablishmentSubscriptionMapper.toDomain(subscription);
  }

  #looksLapsed(subscription: { stripeSubscriptionId: string | null; currentPeriodEnd: Date | null }): boolean {
    return Boolean(
      subscription.stripeSubscriptionId && subscription.currentPeriodEnd && subscription.currentPeriodEnd < new Date(),
    );
  }
}
