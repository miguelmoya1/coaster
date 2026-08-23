import type { EstablishmentId, TimeEntryId, UserId } from '@coaster/common';
import type { DbTimeEntryWhereInput } from '@coaster/core/db';
import { DbService } from '@coaster/core/db';
import { Injectable } from '@nestjs/common';

const entryInclude = {
  user: { select: { id: true, name: true } },
  actor: { select: { id: true, name: true } },
} as const;

@Injectable()
export class TimeEntriesReadRepository {
  constructor(private readonly _db: DbService) {}

  public findByWorkdayRange(establishmentId: EstablishmentId, from: Date, to: Date, userId?: UserId) {
    const where: DbTimeEntryWhereInput = { establishmentId, workdayDate: { gte: from, lte: to } };

    if (userId) {
      where.userId = userId;
    }

    return this._db.dbTimeEntry.findMany({
      where,
      include: entryInclude,
      orderBy: { sequence: 'asc' },
    });
  }

  public async findLatestWorkday(establishmentId: EstablishmentId, userId: UserId) {
    const latest = await this._db.dbTimeEntry.findFirst({
      where: { establishmentId, userId },
      orderBy: { workdayDate: 'desc' },
      select: { workdayDate: true },
    });

    if (!latest) {
      return [];
    }

    return this._db.dbTimeEntry.findMany({
      where: { establishmentId, userId, workdayDate: latest.workdayDate },
      include: entryInclude,
      orderBy: { sequence: 'asc' },
    });
  }

  public findByRoots(rootIds: string[]) {
    return this._db.dbTimeEntry.findMany({
      where: { rootId: { in: rootIds } },
      include: entryInclude,
      orderBy: { sequence: 'asc' },
    });
  }

  public findRecentForUser(establishmentId: EstablishmentId, userId: UserId, since: Date) {
    return this._db.dbTimeEntry.findMany({
      where: { establishmentId, userId, occurredAt: { gte: since } },
      include: entryInclude,
      orderBy: { sequence: 'asc' },
    });
  }

  public async findCurrentById(establishmentId: EstablishmentId, entryId: TimeEntryId) {
    const entry = await this._db.dbTimeEntry.findFirst({
      where: { id: entryId, establishmentId },
      include: { ...entryInclude, supersededBy: { select: { id: true } } },
    });

    return entry;
  }

  public findChain(establishmentId: EstablishmentId) {
    return this._db.dbTimeEntry.findMany({
      where: { establishmentId },
      orderBy: { sequence: 'asc' },
    });
  }
}
