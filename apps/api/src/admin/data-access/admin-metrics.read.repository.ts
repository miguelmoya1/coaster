import type { DbBarSubscriptionWhereInput } from '@coaster/core/db';
import { DbOrderStatus, DbRole, DbService, DbSubscriptionStatus } from '@coaster/core/db';
import { Injectable } from '@nestjs/common';
import { AdminBarReadRepository } from './admin-bar.read.repository';

const liveStripeWhere = (now: Date): DbBarSubscriptionWhereInput => ({
  OR: [
    {
      status: DbSubscriptionStatus.ACTIVE,
      stripeSubscriptionId: { not: null },
      currentPeriodEnd: { gte: now },
    },
    { status: DbSubscriptionStatus.TRIALING, trialEndsAt: { gte: now } },
    { status: DbSubscriptionStatus.CANCELED, currentPeriodEnd: { gte: now } },
  ],
});

@Injectable()
export class AdminMetricsReadRepository {
  constructor(private readonly _db: DbService) {}

  public async collect(now: Date, last7Days: Date, last30Days: Date) {
    const liveGrant = AdminBarReadRepository.liveManualGrantWhere(now);
    const liveStripe = liveStripeWhere(now);

    const [
      barsTotal,
      barsLast7Days,
      barsLast30Days,
      usersTotal,
      usersActive,
      admins,
      usersLast30Days,
      statusGroups,
      planGroups,
      manualGrants,
      stripeSubscriptions,
      withAccess,
      ordersLast30Days,
      revenueLast30Days,
    ] = await this._db.$transaction([
      this._db.dbBar.count(),
      this._db.dbBar.count({ where: { createdAt: { gte: last7Days } } }),
      this._db.dbBar.count({ where: { createdAt: { gte: last30Days } } }),
      this._db.dbUser.count(),
      this._db.dbUser.count({ where: { active: true } }),
      this._db.dbUser.count({ where: { role: DbRole.ADMIN } }),
      this._db.dbUser.count({ where: { createdAt: { gte: last30Days } } }),
      this._db.dbBarSubscription.groupBy({ by: ['status'], _count: { _all: true } }),
      this._db.dbBarSubscription.groupBy({ by: ['plan'], _count: { _all: true } }),
      this._db.dbBarSubscription.count({ where: liveGrant }),
      this._db.dbBarSubscription.count({ where: { AND: [liveStripe, { NOT: liveGrant }] } }),
      this._db.dbBarSubscription.count({ where: { OR: [liveGrant, liveStripe] } }),
      this._db.dbOrder.count({ where: { createdAt: { gte: last30Days } } }),
      this._db.dbOrder.aggregate({
        where: { status: DbOrderStatus.CLOSED, createdAt: { gte: last30Days } },
        _sum: { totalAmount: true },
      }),
    ]);

    return {
      barsTotal,
      barsLast7Days,
      barsLast30Days,
      usersTotal,
      usersActive,
      admins,
      usersLast30Days,
      statusGroups,
      planGroups,
      manualGrants,
      stripeSubscriptions,
      withAccess,
      ordersLast30Days,
      revenueLast30Days: revenueLast30Days._sum.totalAmount ?? 0,
    };
  }
}
