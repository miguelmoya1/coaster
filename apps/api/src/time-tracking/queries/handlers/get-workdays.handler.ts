import type { Shift, TimeEntry, Workday } from '@coaster/common';
import { ClockState, ErrorCodes } from '@coaster/common';
import { GetShiftsQuery } from '@coaster/shifts';
import { BadRequestException } from '@nestjs/common';
import { IQueryHandler, QueryBus, QueryHandler } from '@nestjs/cqrs';
import { TimeEntriesReadRepository } from '../../data-access/time-entries.read.repository';
import {
  formatWorkdayDate,
  parseWorkdayDate,
  shiftWorkdayDate,
  summariseWorkday,
  toDatedMarks,
  toWorkdayDate,
} from '../../domain/workday';
import { TimeEntriesMapper } from '../../mappers/time-entries.mapper';
import { GetWorkdaysQuery } from '../impl/get-workdays.query';

const plannedMinutesByDay = (shifts: Shift[]): Map<string, number> => {
  const planned = new Map<string, number>();

  for (const shift of shifts) {
    const start = new Date(shift.startTime);
    const end = new Date(shift.endTime);
    const key = `${shift.userId}|${formatWorkdayDate(toWorkdayDate(start))}`;
    const minutes = Math.max(0, Math.round((end.getTime() - start.getTime()) / 60_000));

    planned.set(key, (planned.get(key) ?? 0) + minutes);
  }

  return planned;
};

@QueryHandler(GetWorkdaysQuery)
export class GetWorkdaysHandler implements IQueryHandler<GetWorkdaysQuery, Workday[]> {
  constructor(
    private readonly _readRepo: TimeEntriesReadRepository,
    private readonly _queryBus: QueryBus,
  ) {}

  async execute(query: GetWorkdaysQuery): Promise<Workday[]> {
    const from = parseWorkdayDate(query.from);
    const to = parseWorkdayDate(query.to);

    if (isNaN(from.getTime()) || isNaN(to.getTime()) || from > to) {
      throw new BadRequestException(ErrorCodes.INVALID_DATE);
    }

    const rows = await this._readRepo.findByWorkdayRange(query.barId, from, to, query.userId);
    const shifts = await this._queryBus.execute<GetShiftsQuery, Shift[]>(
      new GetShiftsQuery(query.barId, from.toISOString(), shiftWorkdayDate(to, 1).toISOString()),
    );
    const planned = plannedMinutesByDay(shifts);

    const days = new Map<string, TimeEntry[]>();

    for (const entry of TimeEntriesMapper.groupByRoot(rows)) {
      const key = `${entry.userId}|${entry.workdayDate}`;
      const day = days.get(key);

      if (day) {
        day.push(entry);
      } else {
        days.set(key, [entry]);
      }
    }

    const now = new Date();

    return [...days.entries()]
      .map(([key, entries]) => {
        const totals = summariseWorkday(toDatedMarks(entries), now);

        return {
          date: entries[0].workdayDate,
          userId: entries[0].userId,
          userName: entries[0].userName,
          state: totals?.state ?? ClockState.OUT,
          workedMinutes: totals?.workedMinutes ?? 0,
          breakMinutes: totals?.breakMinutes ?? 0,
          plannedMinutes: planned.get(key) ?? null,
          entries,
        };
      })
      .sort((a, b) => b.date.localeCompare(a.date) || a.userName.localeCompare(b.userName));
  }
}
