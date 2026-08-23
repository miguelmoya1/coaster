import { ClockState, TimeEntryType, WorkdayDiscrepancy } from '@coaster/common';
import { describe, expect, it } from 'vitest';
import {
  DatedMark,
  findDiscrepancies,
  formatWorkdayDate,
  planMark,
  PlannedShift,
  summariseWorkday,
  toWorkdayDate,
} from './workday';

const at = (iso: string) => new Date(iso);

const mark = (type: TimeEntryType, iso: string, workdayDate = '2026-08-08'): DatedMark => ({
  type,
  occurredAt: at(iso),
  workdayDate,
});

describe('summariseWorkday', () => {
  it('should discount the break from the worked time', () => {
    const marks = [
      mark(TimeEntryType.CLOCK_IN, '2026-08-08T08:00:00Z'),
      mark(TimeEntryType.BREAK_START, '2026-08-08T11:00:00Z'),
      mark(TimeEntryType.BREAK_END, '2026-08-08T11:30:00Z'),
      mark(TimeEntryType.CLOCK_OUT, '2026-08-08T16:00:00Z'),
    ];

    expect(summariseWorkday(marks, at('2026-08-08T20:00:00Z'))).toEqual({
      state: ClockState.OUT,
      workedMinutes: 450,
      breakMinutes: 30,
    });
  });

  it('should keep counting an open shift up to now', () => {
    const marks = [mark(TimeEntryType.CLOCK_IN, '2026-08-08T08:00:00Z')];

    expect(summariseWorkday(marks, at('2026-08-08T10:00:00Z'))).toEqual({
      state: ClockState.IN,
      workedMinutes: 120,
      breakMinutes: 0,
    });
  });

  it('should count time on an open break as break, not work', () => {
    const marks = [
      mark(TimeEntryType.CLOCK_IN, '2026-08-08T08:00:00Z'),
      mark(TimeEntryType.BREAK_START, '2026-08-08T09:00:00Z'),
    ];

    expect(summariseWorkday(marks, at('2026-08-08T09:30:00Z'))).toEqual({
      state: ClockState.ON_BREAK,
      workedMinutes: 60,
      breakMinutes: 30,
    });
  });

  it('should allow clocking out straight from a break', () => {
    const marks = [
      mark(TimeEntryType.CLOCK_IN, '2026-08-08T08:00:00Z'),
      mark(TimeEntryType.BREAK_START, '2026-08-08T09:00:00Z'),
      mark(TimeEntryType.CLOCK_OUT, '2026-08-08T09:30:00Z'),
    ];

    expect(summariseWorkday(marks, at('2026-08-08T12:00:00Z'))).toMatchObject({ state: ClockState.OUT });
  });

  it('should reject a day that starts with a clock out', () => {
    expect(summariseWorkday([mark(TimeEntryType.CLOCK_OUT, '2026-08-08T16:00:00Z')], at('2026-08-08T20:00:00Z'))).toBe(
      null,
    );
  });

  it('should reject two clock ins in a row', () => {
    const marks = [
      mark(TimeEntryType.CLOCK_IN, '2026-08-08T08:00:00Z'),
      mark(TimeEntryType.CLOCK_IN, '2026-08-08T09:00:00Z'),
    ];

    expect(summariseWorkday(marks, at('2026-08-08T12:00:00Z'))).toBe(null);
  });

  it('should read marks in time order, not in insertion order', () => {
    const marks = [
      mark(TimeEntryType.CLOCK_OUT, '2026-08-08T16:00:00Z'),
      mark(TimeEntryType.CLOCK_IN, '2026-08-08T08:00:00Z'),
    ];

    expect(summariseWorkday(marks, at('2026-08-08T20:00:00Z'))).toMatchObject({ workedMinutes: 480 });
  });
});

describe('toWorkdayDate', () => {
  it('should use the establishment local date, not the UTC one', () => {
    expect(formatWorkdayDate(toWorkdayDate(at('2026-08-08T23:30:00Z')))).toBe('2026-08-09');
  });
});

describe('planMark', () => {
  it('should open the day on the calendar date of the clock in', () => {
    const workday = planMark(TimeEntryType.CLOCK_IN, at('2026-08-08T08:00:00Z'), []);

    expect(workday && formatWorkdayDate(workday)).toBe('2026-08-08');
  });

  it('should refuse a break that starts before clocking in', () => {
    expect(planMark(TimeEntryType.BREAK_START, at('2026-08-08T08:00:00Z'), [])).toBe(null);
  });

  it('should keep a night shift on the day it started', () => {
    const open = [mark(TimeEntryType.CLOCK_IN, '2026-08-08T20:00:00Z', '2026-08-08')];
    const workday = planMark(TimeEntryType.CLOCK_OUT, at('2026-08-09T02:00:00Z'), open);

    expect(workday && formatWorkdayDate(workday)).toBe('2026-08-08');
  });

  it('should start a fresh day once the previous one is closed', () => {
    const closed = [
      mark(TimeEntryType.CLOCK_IN, '2026-08-08T20:00:00Z', '2026-08-08'),
      mark(TimeEntryType.CLOCK_OUT, '2026-08-08T22:00:00Z', '2026-08-08'),
    ];
    const workday = planMark(TimeEntryType.CLOCK_IN, at('2026-08-09T08:00:00Z'), closed);

    expect(workday && formatWorkdayDate(workday)).toBe('2026-08-09');
  });

  it('should close the day it started however long the shift ran', () => {
    const open = [mark(TimeEntryType.CLOCK_IN, '2026-08-08T20:00:00Z', '2026-08-08')];
    const daysLater = planMark(TimeEntryType.CLOCK_OUT, at('2026-08-11T09:00:00Z'), open);

    expect(daysLater && formatWorkdayDate(daysLater)).toBe('2026-08-08');
  });

  it('should refuse to start a second day while one is still open', () => {
    const open = [mark(TimeEntryType.CLOCK_IN, '2026-08-08T20:00:00Z', '2026-08-08')];

    expect(planMark(TimeEntryType.CLOCK_IN, at('2026-08-09T08:00:00Z'), open)).toBe(null);
  });

  it('should let the worker start a second shift on a day already closed', () => {
    const closed = [
      mark(TimeEntryType.CLOCK_IN, '2026-08-08T08:00:00Z', '2026-08-08'),
      mark(TimeEntryType.CLOCK_OUT, '2026-08-08T12:00:00Z', '2026-08-08'),
    ];
    const workday = planMark(TimeEntryType.CLOCK_IN, at('2026-08-08T18:00:00Z'), closed);

    expect(workday && formatWorkdayDate(workday)).toBe('2026-08-08');
  });

  it('should ignore an open day whose marks come after the one being filed', () => {
    const later = [mark(TimeEntryType.CLOCK_IN, '2026-08-08T20:00:00Z', '2026-08-08')];
    const workday = planMark(TimeEntryType.CLOCK_IN, at('2026-08-08T06:00:00Z'), later);

    expect(workday).toBe(null);
  });
});

describe('summariseWorkday on a day nobody closed', () => {
  it('should keep counting for as long as it stays open', () => {
    const marks = [mark(TimeEntryType.CLOCK_IN, '2026-08-08T08:00:00Z', '2026-08-08')];
    const daysLater = at('2026-08-11T08:00:00Z');

    expect(summariseWorkday(marks, daysLater)).toEqual({
      state: ClockState.IN,
      workedMinutes: 3 * 24 * 60,
      breakMinutes: 0,
    });
  });
});

describe('findDiscrepancies', () => {
  const shift = (startIso: string, endIso: string): PlannedShift => ({
    startsAt: at(startIso),
    endsAt: at(endIso),
    minutes: Math.round((at(endIso).getTime() - at(startIso).getTime()) / 60_000),
  });

  const morning = () => shift('2026-08-08T08:00:00Z', '2026-08-08T16:00:00Z');

  const workedDay = (inIso: string, outIso: string) => [
    mark(TimeEntryType.CLOCK_IN, inIso),
    mark(TimeEntryType.CLOCK_OUT, outIso),
  ];

  it('should say nothing when the day matches the rota', () => {
    const marks = workedDay('2026-08-08T08:00:00Z', '2026-08-08T16:00:00Z');

    expect(findDiscrepancies(marks, morning(), 480)).toEqual([]);
  });

  it('should flag a scheduled day nobody clocked into', () => {
    expect(findDiscrepancies([], morning(), 0)).toEqual([WorkdayDiscrepancy.NO_SHOW]);
  });

  it('should flag a day worked with no shift on the rota', () => {
    const marks = workedDay('2026-08-08T08:00:00Z', '2026-08-08T16:00:00Z');

    expect(findDiscrepancies(marks, null, 480)).toEqual([WorkdayDiscrepancy.UNPLANNED]);
  });

  it('should say nothing about a day with neither rota nor marks', () => {
    expect(findDiscrepancies([], null, 0)).toEqual([]);
  });

  it('should flag arriving well after the shift started', () => {
    const marks = workedDay('2026-08-08T09:00:00Z', '2026-08-08T16:00:00Z');

    expect(findDiscrepancies(marks, morning(), 420)).toContain(WorkdayDiscrepancy.LATE_START);
  });

  it('should forgive a few minutes late', () => {
    const marks = workedDay('2026-08-08T08:05:00Z', '2026-08-08T16:00:00Z');

    expect(findDiscrepancies(marks, morning(), 475)).toEqual([]);
  });

  it('should flag leaving well before the shift ended', () => {
    const marks = workedDay('2026-08-08T08:00:00Z', '2026-08-08T14:00:00Z');

    expect(findDiscrepancies(marks, morning(), 360)).toContain(WorkdayDiscrepancy.EARLY_FINISH);
  });

  it('should not call it an early finish while the shift is still open', () => {
    const marks = [mark(TimeEntryType.CLOCK_IN, '2026-08-08T08:00:00Z')];

    expect(findDiscrepancies(marks, morning(), 120)).toEqual([]);
  });

  it('should flag working noticeably longer than the rota said', () => {
    const marks = workedDay('2026-08-08T08:00:00Z', '2026-08-08T18:00:00Z');

    expect(findDiscrepancies(marks, morning(), 600)).toContain(WorkdayDiscrepancy.OVERTIME);
  });

  it('should report every discrepancy a day carries at once', () => {
    const marks = workedDay('2026-08-08T10:00:00Z', '2026-08-08T14:00:00Z');

    expect(findDiscrepancies(marks, morning(), 240)).toEqual([
      WorkdayDiscrepancy.LATE_START,
      WorkdayDiscrepancy.EARLY_FINISH,
    ]);
  });
});
