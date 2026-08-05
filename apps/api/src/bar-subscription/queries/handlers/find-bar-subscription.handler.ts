import type { BarSubscription } from '@coaster/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { BarSubscriptionReadRepository } from '../../data-access/bar-subscription.read.repository';
import { BarSubscriptionMapper } from '../../mappers/bar-subscription.mapper';
import { FindBarSubscriptionQuery } from '../impl/find-bar-subscription.query';

@QueryHandler(FindBarSubscriptionQuery)
export class FindBarSubscriptionHandler
  implements IQueryHandler<FindBarSubscriptionQuery, BarSubscription | null>
{
  constructor(private readonly _readRepo: BarSubscriptionReadRepository) {}

  async execute(query: FindBarSubscriptionQuery): Promise<BarSubscription | null> {
    const subscription = await this._readRepo.findByBarId(query.barId);

    if (!subscription) {
      return null;
    }

    return BarSubscriptionMapper.toDomain(subscription);
  }
}
