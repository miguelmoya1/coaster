import type { DbEstablishmentSubscriptionWhereInput } from '@coaster/core/db';
import { DbOrderStatus, DbRole, DbService, DbSubscriptionStatus } from '@coaster/core/db';
import { Injectable } from '@nestjs/common';
import { AdminEstablishmentReadRepository } from './admin-establishment.read.repository';

const liveStripeWhere = (now: Date): DbEstablishmentSubscriptionWhereInput => ({
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
    const liveGrant = AdminEstablishmentReadRepository.liveManualGrantWhere(now);
    const liveStripe = liveStripeWhere(now);

    const [
      establishmentsTotal,
      establishmentsLast7Days,
      establishmentsLast30Days,
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
      this._db.dbEstablishment.count(),
      this._db.dbEstablishment.count({ where: { createdAt: { gte: last7Days } } }),
      this._db.dbEstablishment.count({ where: { createdAt: { gte: last30Days } } }),
      this._db.dbUser.count(),
      this._db.dbUser.count({ where: { active: true } }),
      this._db.dbUser.count({ where: { role: DbRole.ADMIN } }),
      this._db.dbUser.count({ where: { createdAt: { gte: last30Days } } }),
      this._db.dbEstablishmentSubscription.groupBy({ by: ['status'], _count: { _all: true } }),
      this._db.dbEstablishmentSubscription.groupBy({ by: ['plan'], _count: { _all: true } }),
      this._db.dbEstablishmentSubscription.count({ where: liveGrant }),
      this._db.dbEstablishmentSubscription.count({ where: { AND: [liveStripe, { NOT: liveGrant }] } }),
      this._db.dbEstablishmentSubscription.count({ where: { OR: [liveGrant, liveStripe] } }),
      this._db.dbOrder.count({ where: { createdAt: { gte: last30Days } } }),
      this._db.dbOrder.aggregate({
        where: { status: DbOrderStatus.CLOSED, createdAt: { gte: last30Days } },
        _sum: { totalAmount: true },
      }),
    ]);

    return {
      establishmentsTotal,
      establishmentsLast7Days,
      establishmentsLast30Days,
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
