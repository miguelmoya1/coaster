import type { AdminBetaTestersQuery, BetaTesterId, UserId } from '@coaster/common';
import type { DbBetaTesterWhereInput } from '@coaster/core/db';
import { DbService } from '@coaster/core/db';
import { Injectable } from '@nestjs/common';

const betaTesterSelect = {
  id: true,
  email: true,
  note: true,
  createdAt: true,
  invitedBy: { select: { name: true } },
} as const;

const buildWhere = (query: AdminBetaTestersQuery): DbBetaTesterWhereInput => {
  const search = query.q?.trim();

  if (!search) {
    return {};
  }

  return {
    OR: [{ email: { contains: search, mode: 'insensitive' } }, { note: { contains: search, mode: 'insensitive' } }],
  };
};

@Injectable()
export class AdminBetaTesterRepository {
  constructor(private readonly _db: DbService) {}

  public async list(query: AdminBetaTestersQuery, page: number, pageSize: number) {
    const where = buildWhere(query);

    const [items, total] = await this._db.$transaction([
      this._db.dbBetaTester.findMany({
        where,
        select: betaTesterSelect,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this._db.dbBetaTester.count({ where }),
    ]);

    return { items, total };
  }

  public findSignUps(emails: string[]) {
    return this._db.dbUser.findMany({
      where: { email: { in: emails } },
      select: { id: true, email: true, createdAt: true },
    });
  }

  public findById(betaTesterId: BetaTesterId) {
    return this._db.dbBetaTester.findUnique({ where: { id: betaTesterId }, select: betaTesterSelect });
  }

  public findByEmail(email: string) {
    return this._db.dbBetaTester.findUnique({ where: { email }, select: betaTesterSelect });
  }

  public add(email: string, note: string | null, invitedById: UserId) {
    return this._db.dbBetaTester.create({ data: { email, note, invitedById }, select: betaTesterSelect });
  }

  public remove(betaTesterId: BetaTesterId) {
    return this._db.dbBetaTester.delete({ where: { id: betaTesterId } });
  }
}
