import type { SubscriptionSeats } from '@coaster/common';
import { getExtraSeatPriceCents, getIncludedSeats } from '@coaster/stripe';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { ConfigService } from '@nestjs/config';
import { EstablishmentSubscriptionReadRepository } from '../../data-access/establishment-subscription.read.repository';
import { GetSubscriptionSeatsQuery } from '../impl/get-subscription-seats.query';

@QueryHandler(GetSubscriptionSeatsQuery)
export class GetSubscriptionSeatsHandler implements IQueryHandler<GetSubscriptionSeatsQuery, SubscriptionSeats> {
  constructor(
    private readonly _readRepo: EstablishmentSubscriptionReadRepository,
    private readonly _configService: ConfigService,
  ) {}

  async execute(query: GetSubscriptionSeatsQuery): Promise<SubscriptionSeats> {
    const { establishmentId } = query;
    const [used, subscription] = await Promise.all([
      this._readRepo.countBillableSeats(establishmentId),
      this._readRepo.findByEstablishmentId(establishmentId),
    ]);

    return {
      used,
      billed: subscription?.seats ?? 0,
      included: getIncludedSeats(this._configService),
      extraPriceCents: getExtraSeatPriceCents(this._configService),
    };
  }
}
