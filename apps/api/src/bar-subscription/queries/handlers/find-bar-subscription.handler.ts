import type { BarSubscription } from '@coaster/common';
import { Logger } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { BarSubscriptionReadRepository } from '../../data-access/bar-subscription.read.repository';
import { BarSubscriptionMapper } from '../../mappers/bar-subscription.mapper';
import { FindBarSubscriptionQuery } from '../impl/find-bar-subscription.query';

@QueryHandler(FindBarSubscriptionQuery)
export class FindBarSubscriptionHandler implements IQueryHandler<FindBarSubscriptionQuery, BarSubscription> {
  private readonly _logger = new Logger(FindBarSubscriptionHandler.name);

  constructor(private readonly _readRepo: BarSubscriptionReadRepository) {}

  async execute(query: FindBarSubscriptionQuery): Promise<BarSubscription> {
    const { barId } = query;
    const subscription = await this._readRepo.findByBarId(barId);

    if (!subscription) {
      this._logger.debug(`No subscription stored for barId=${barId}, returning the default FREE plan`);
      return BarSubscriptionMapper.toFreeDefault(barId);
    }

    return BarSubscriptionMapper.toDomain(subscription);
  }
}
