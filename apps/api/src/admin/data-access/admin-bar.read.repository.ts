import type { AdminBarsQuery, BarId } from '@coaster/common';
import { BarBillingSource } from '@coaster/common';
import type { DbBarGetPayload, DbBarInclude, DbBarSubscriptionWhereInput, DbBarWhereInput } from '@coaster/core/db';
import { DbBarRole, DbOrderStatus, DbService, DbSubscriptionStatus } from '@coaster/core/db';
import { Injectable } from '@nestjs/common';

const barListInclude = {
  billing: true,
  _count: { select: { members: true } },
  members: {
    where: { role: DbBarRole.OWNER, active: true, deletedAt: null },
    orderBy: { createdAt: 'asc' },
    take: 1,
    select: { user: { select: { name: true, email: true } } },
  },
} satisfies DbBarInclude;

export type DbBarListRow = DbBarGetPayload<{ include: typeof barListInclude }>;

@Injectable()
export class AdminBarReadRepository {
  constructor(private readonly _db: DbService) {}

  public async listBars(query: AdminBarsQuery, page: number, pageSize: number) {
    const where = this.#buildWhere(query);

    const [items, total] = await this._db.$transaction([
      this._db.dbBar.findMany({
        where,
        include: barListInclude,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this._db.dbBar.count({ where }),
    ]);

    return { items, total };
  }

  public findBarById(barId: BarId) {
    return this._db.dbBar.findUnique({ where: { id: barId }, include: barListInclude });
  }

  public findMembers(barId: BarId) {
    return this._db.dbBarMember.findMany({
      where: { barId, deletedAt: null },
      orderBy: [{ role: 'asc' }, { createdAt: 'asc' }],
      select: {
        id: true,
        role: true,
        active: true,
        createdAt: true,
        user: { select: { id: true, name: true, email: true, photoUrl: true } },
      },
    });
  }

  public findMembership(barId: BarId, userId: string) {
    return this._db.dbBarMember.findUnique({
      where: { userId_barId: { userId, barId } },
      select: { id: true, role: true, user: { select: { name: true, email: true } } },
    });
  }

  public findGrantorName(userId: string) {
    return this._db.dbUser.findUnique({ where: { id: userId }, select: { name: true } });
  }

  public countOwners(barId: BarId) {
    return this._db.dbBarMember.count({
      where: { barId, role: DbBarRole.OWNER, active: true, deletedAt: null },
    });
  }

  public async countersFor(barId: BarId, since: Date) {
    const [categories, products, tables, orders, ordersLast30Days, revenue] = await this._db.$transaction([
      this._db.dbCategory.count({ where: { barId, deletedAt: null } }),
      this._db.dbProduct.count({ where: { category: { barId }, deletedAt: null } }),
      this._db.dbTable.count({ where: { barId } }),
      this._db.dbOrder.count({ where: { barId } }),
      this._db.dbOrder.count({ where: { barId, createdAt: { gte: since } } }),
      this._db.dbOrder.aggregate({
        where: { barId, status: DbOrderStatus.CLOSED, createdAt: { gte: since } },
        _sum: { totalAmount: true },
      }),
    ]);

    return {
      categories,
      products,
      tables,
      orders,
      ordersLast30Days,
      revenueLast30Days: revenue._sum.totalAmount ?? 0,
    };
  }

  #buildWhere(query: AdminBarsQuery): DbBarWhereInput {
    const filters: DbBarWhereInput[] = [];
    const search = query.q?.trim();

    if (search) {
      filters.push({
        OR: [
          { id: { equals: search } },
          { name: { contains: search, mode: 'insensitive' } },
          { members: { some: { user: { email: { contains: search, mode: 'insensitive' } } } } },
        ],
      });
    }

    if (query.status) {
      filters.push({ billing: { status: query.status as DbSubscriptionStatus } });
    }

    const liveGrant = AdminBarReadRepository.liveManualGrantWhere();

    switch (query.billingSource) {
      case BarBillingSource.MANUAL:
        filters.push({ billing: liveGrant });
        break;
      case BarBillingSource.STRIPE:
        filters.push({ billing: { stripeSubscriptionId: { not: null }, NOT: liveGrant } });
        break;
      case BarBillingSource.NONE:
        filters.push({
          OR: [{ billing: { is: null } }, { billing: { stripeSubscriptionId: null, NOT: liveGrant } }],
        });
        break;
      default:
        break;
    }

    return filters.length > 0 ? { AND: filters } : {};
  }

  public static liveManualGrantWhere(now = new Date()): DbBarSubscriptionWhereInput {
    return {
      manualPlan: { not: null },
      OR: [{ manualGrantExpiresAt: null }, { manualGrantExpiresAt: { gte: now } }],
    };
  }
}
