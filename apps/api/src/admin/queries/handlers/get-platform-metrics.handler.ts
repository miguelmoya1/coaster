import type { AdminPlatformMetrics } from '@coaster/common';
import { SubscriptionPlan, SubscriptionStatus } from '@coaster/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { AdminMetricsReadRepository } from '../../data-access/admin-metrics.read.repository';
import { daysAgo } from '../../utils/pagination';
import { GetPlatformMetricsQuery } from '../impl/get-platform-metrics.query';

const emptyCounts = <T extends string>(keys: readonly T[]): Record<T, number> =>
  keys.reduce((acc, key) => ({ ...acc, [key]: 0 }), {} as Record<T, number>);

@QueryHandler(GetPlatformMetricsQuery)
export class GetPlatformMetricsHandler implements IQueryHandler<GetPlatformMetricsQuery, AdminPlatformMetrics> {
  constructor(private readonly _readRepo: AdminMetricsReadRepository) {}

  async execute(): Promise<AdminPlatformMetrics> {
    const now = new Date();
    const metrics = await this._readRepo.collect(now, daysAgo(7, now), daysAgo(30, now));

    const byStatus = emptyCounts(Object.values(SubscriptionStatus));
    for (const group of metrics.statusGroups) {
      byStatus[group.status as SubscriptionStatus] = group._count._all;
    }

    const byPlan = emptyCounts(Object.values(SubscriptionPlan));
    for (const group of metrics.planGroups) {
      byPlan[group.plan as SubscriptionPlan] = group._count._all;
    }

    return {
      bars: {
        total: metrics.barsTotal,
        createdLast7Days: metrics.barsLast7Days,
        createdLast30Days: metrics.barsLast30Days,
      },
      users: {
        total: metrics.usersTotal,
        active: metrics.usersActive,
        admins: metrics.admins,
        createdLast30Days: metrics.usersLast30Days,
      },
      subscriptions: {
        withAccess: metrics.withAccess,
        stripe: metrics.stripeSubscriptions,
        manual: metrics.manualGrants,
        byStatus,
        byPlan,
      },
      activity: {
        ordersLast30Days: metrics.ordersLast30Days,
        revenueLast30Days: metrics.revenueLast30Days,
      },
    };
  }
}
