import type { EstablishmentSubscription } from '@coaster/common';
import { Logger } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { EstablishmentSubscriptionReadRepository } from '../../data-access/establishment-subscription.read.repository';
import { EstablishmentSubscriptionMapper } from '../../mappers/establishment-subscription.mapper';
import { FindEstablishmentSubscriptionQuery } from '../impl/find-establishment-subscription.query';

@QueryHandler(FindEstablishmentSubscriptionQuery)
export class FindEstablishmentSubscriptionHandler implements IQueryHandler<
  FindEstablishmentSubscriptionQuery,
  EstablishmentSubscription
> {
  private readonly _logger = new Logger(FindEstablishmentSubscriptionHandler.name);

  constructor(private readonly _readRepo: EstablishmentSubscriptionReadRepository) {}

  async execute(query: FindEstablishmentSubscriptionQuery): Promise<EstablishmentSubscription> {
    const { establishmentId } = query;
    const subscription = await this._readRepo.findByEstablishmentId(establishmentId);

    if (!subscription) {
      this._logger.debug(
        `No subscription stored for establishmentId=${establishmentId}, returning the default FREE plan`,
      );
      return EstablishmentSubscriptionMapper.toFreeDefault(establishmentId);
    }

    return EstablishmentSubscriptionMapper.toDomain(subscription);
  }
}
