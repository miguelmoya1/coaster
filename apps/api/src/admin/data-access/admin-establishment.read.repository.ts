import type { AdminEstablishmentsQuery, EstablishmentId } from '@coaster/common';
import { EstablishmentBillingSource } from '@coaster/common';
import type {
  DbEstablishmentGetPayload,
  DbEstablishmentInclude,
  DbEstablishmentSubscriptionWhereInput,
  DbEstablishmentWhereInput,
} from '@coaster/core/db';
import { DbEstablishmentRole, DbOrderStatus, DbService, DbSubscriptionStatus } from '@coaster/core/db';
import { Injectable } from '@nestjs/common';

const establishmentListInclude = {
  billing: true,
  _count: { select: { members: true } },
  members: {
    where: { role: DbEstablishmentRole.OWNER, active: true, deletedAt: null },
    orderBy: { createdAt: 'asc' },
    take: 1,
    select: { user: { select: { name: true, email: true } } },
  },
} satisfies DbEstablishmentInclude;

export type DbEstablishmentListRow = DbEstablishmentGetPayload<{ include: typeof establishmentListInclude }>;

@Injectable()
export class AdminEstablishmentReadRepository {
  constructor(private readonly _db: DbService) {}

  public async listEstablishments(query: AdminEstablishmentsQuery, page: number, pageSize: number) {
    const where = this.#buildWhere(query);

    const [items, total] = await this._db.$transaction([
      this._db.dbEstablishment.findMany({
        where,
        include: establishmentListInclude,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this._db.dbEstablishment.count({ where }),
    ]);

    return { items, total };
  }

  public findEstablishmentById(establishmentId: EstablishmentId) {
    return this._db.dbEstablishment.findUnique({ where: { id: establishmentId }, include: establishmentListInclude });
  }

  public findMembers(establishmentId: EstablishmentId) {
    return this._db.dbEstablishmentMember.findMany({
      where: { establishmentId, deletedAt: null },
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

  public findMembership(establishmentId: EstablishmentId, userId: string) {
    return this._db.dbEstablishmentMember.findUnique({
      where: { userId_establishmentId: { userId, establishmentId } },
      select: { id: true, role: true, user: { select: { name: true, email: true } } },
    });
  }

  public findGrantorName(userId: string) {
    return this._db.dbUser.findUnique({ where: { id: userId }, select: { name: true } });
  }

  public countOwners(establishmentId: EstablishmentId) {
    return this._db.dbEstablishmentMember.count({
      where: { establishmentId, role: DbEstablishmentRole.OWNER, active: true, deletedAt: null },
    });
  }

  public async countersFor(establishmentId: EstablishmentId, since: Date) {
    const [categories, products, tables, orders, ordersLast30Days, revenue] = await this._db.$transaction([
      this._db.dbCategory.count({ where: { establishmentId, deletedAt: null } }),
      this._db.dbProduct.count({ where: { category: { establishmentId }, deletedAt: null } }),
      this._db.dbTable.count({ where: { establishmentId } }),
      this._db.dbOrder.count({ where: { establishmentId } }),
      this._db.dbOrder.count({ where: { establishmentId, createdAt: { gte: since } } }),
      this._db.dbOrder.aggregate({
        where: { establishmentId, status: DbOrderStatus.CLOSED, createdAt: { gte: since } },
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

  #buildWhere(query: AdminEstablishmentsQuery): DbEstablishmentWhereInput {
    const filters: DbEstablishmentWhereInput[] = [];
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

    const liveGrant = AdminEstablishmentReadRepository.liveManualGrantWhere();

    switch (query.billingSource) {
      case EstablishmentBillingSource.MANUAL:
        filters.push({ billing: liveGrant });
        break;
      case EstablishmentBillingSource.STRIPE:
        filters.push({ billing: { stripeSubscriptionId: { not: null }, NOT: liveGrant } });
        break;
      case EstablishmentBillingSource.NONE:
        filters.push({
          OR: [{ billing: { is: null } }, { billing: { stripeSubscriptionId: null, NOT: liveGrant } }],
        });
        break;
      default:
        break;
    }

    return filters.length > 0 ? { AND: filters } : {};
  }

  public static liveManualGrantWhere(now = new Date()): DbEstablishmentSubscriptionWhereInput {
    return {
      manualPlan: { not: null },
      OR: [{ manualGrantExpiresAt: null }, { manualGrantExpiresAt: { gte: now } }],
    };
  }
}
