import type { BarId, TimeEntryId, UserId } from '@coaster/common';
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

  public findByWorkdayRange(barId: BarId, from: Date, to: Date, userId?: UserId) {
    const where: DbTimeEntryWhereInput = { barId, workdayDate: { gte: from, lte: to } };

    if (userId) {
      where.userId = userId;
    }

    return this._db.dbTimeEntry.findMany({
      where,
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

  public findRecentForUser(barId: BarId, userId: UserId, since: Date) {
    return this._db.dbTimeEntry.findMany({
      where: { barId, userId, occurredAt: { gte: since } },
      include: entryInclude,
      orderBy: { sequence: 'asc' },
    });
  }

  public async findCurrentById(barId: BarId, entryId: TimeEntryId) {
    const entry = await this._db.dbTimeEntry.findFirst({
      where: { id: entryId, barId },
      include: { ...entryInclude, supersededBy: { select: { id: true } } },
    });

    return entry;
  }

  public findChain(barId: BarId) {
    return this._db.dbTimeEntry.findMany({
      where: { barId },
      orderBy: { sequence: 'asc' },
    });
  }
}
