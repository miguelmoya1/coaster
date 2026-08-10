import type { AdminUsersQuery, UserId } from '@coaster/common';
import type { DbUserWhereInput } from '@coaster/core/db';
import { DbRole, DbService } from '@coaster/core/db';
import { Injectable } from '@nestjs/common';

const userListSelect = {
  id: true,
  name: true,
  email: true,
  photoUrl: true,
  role: true,
  active: true,
  language: true,
  createdAt: true,
  _count: { select: { memberships: true } },
} as const;

const buildWhere = (query: AdminUsersQuery): DbUserWhereInput => {
  const where: DbUserWhereInput = {};
  const search = query.q?.trim();

  if (search) {
    where.OR = [
      { id: { equals: search } },
      { name: { contains: search, mode: 'insensitive' } },
      { email: { contains: search, mode: 'insensitive' } },
    ];
  }

  if (query.role) {
    where.role = query.role as DbRole;
  }

  if (query.active !== undefined) {
    where.active = query.active;
  }

  return where;
};

@Injectable()
export class AdminUserReadRepository {
  constructor(private readonly _db: DbService) {}

  public async listUsers(query: AdminUsersQuery, page: number, pageSize: number) {
    const where = buildWhere(query);

    const [items, total] = await this._db.$transaction([
      this._db.dbUser.findMany({
        where,
        select: userListSelect,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this._db.dbUser.count({ where }),
    ]);

    return { items, total };
  }

  public findUserById(userId: UserId) {
    return this._db.dbUser.findUnique({ where: { id: userId }, select: userListSelect });
  }

  public findMemberships(userId: UserId) {
    return this._db.dbEstablishmentMember.findMany({
      where: { userId, deletedAt: null },
      orderBy: { createdAt: 'desc' },
      select: {
        role: true,
        active: true,
        createdAt: true,
        establishment: { select: { id: true, name: true } },
      },
    });
  }

  public countAdmins() {
    return this._db.dbUser.count({ where: { role: DbRole.ADMIN, active: true } });
  }
}
