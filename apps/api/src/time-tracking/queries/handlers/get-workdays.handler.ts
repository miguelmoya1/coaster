import type { Shift, TimeEntry, UserId, Workday } from '@coaster/common';
import { ClockState, ErrorCodes } from '@coaster/common';
import { GetShiftsQuery } from '@coaster/shifts';
import { BadRequestException } from '@nestjs/common';
import { IQueryHandler, QueryBus, QueryHandler } from '@nestjs/cqrs';
import { TimeEntriesReadRepository } from '../../data-access/time-entries.read.repository';
import {
  findDiscrepancies,
  formatWorkdayDate,
  parseWorkdayDate,
  shiftWorkdayDate,
  summariseWorkday,
  type PlannedShift,
  toDatedMarks,
  toWorkdayDate,
} from '../../domain/workday';
import { TimeEntriesMapper } from '../../mappers/time-entries.mapper';
import { GetWorkdaysQuery } from '../impl/get-workdays.query';

interface PlannedDay extends PlannedShift {
  userId: UserId;
  userName: string;
  date: string;
}

const plannedByDay = (shifts: Shift[]): Map<string, PlannedDay> => {
  const planned = new Map<string, PlannedDay>();

  for (const shift of shifts) {
    const startsAt = new Date(shift.startTime);
    const endsAt = new Date(shift.endTime);
    const date = formatWorkdayDate(toWorkdayDate(startsAt));
    const key = `${shift.userId}|${date}`;
    const minutes = Math.max(0, Math.round((endsAt.getTime() - startsAt.getTime()) / 60_000));
    const current = planned.get(key);

    planned.set(key, {
      userId: shift.userId,
      userName: shift.userName,
      date,
      startsAt: current && current.startsAt < startsAt ? current.startsAt : startsAt,
      endsAt: current && current.endsAt > endsAt ? current.endsAt : endsAt,
      minutes: (current?.minutes ?? 0) + minutes,
    });
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

    const rows = await this._readRepo.findByWorkdayRange(query.establishmentId, from, to, query.userId);
    const shifts = await this._queryBus.execute<GetShiftsQuery, Shift[]>(
      new GetShiftsQuery(query.establishmentId, from.toISOString(), shiftWorkdayDate(to, 1).toISOString()),
    );
    const planned = plannedByDay(shifts);

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

    for (const [key, shift] of planned) {
      if (!days.has(key) && shift.date >= query.from && shift.date <= query.to) {
        days.set(key, []);
      }
    }

    const now = new Date();

    return [...days.entries()]
      .map(([key, entries]) => {
        const marks = toDatedMarks(entries);
        const totals = summariseWorkday(marks, now);
        const shift = planned.get(key) ?? null;
        const workedMinutes = totals?.workedMinutes ?? 0;

        return {
          date: entries[0]?.workdayDate ?? shift!.date,
          userId: entries[0]?.userId ?? shift!.userId,
          userName: entries[0]?.userName ?? shift!.userName,
          state: totals?.state ?? ClockState.OUT,
          workedMinutes,
          breakMinutes: totals?.breakMinutes ?? 0,
          plannedMinutes: shift?.minutes ?? null,
          plannedStart: shift?.startsAt.toISOString() ?? null,
          plannedEnd: shift?.endsAt.toISOString() ?? null,
          discrepancies: findDiscrepancies(marks, shift, workedMinutes),
          entries,
        };
      })
      .sort((a, b) => b.date.localeCompare(a.date) || a.userName.localeCompare(b.userName));
  }
}
