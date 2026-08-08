import { ClockState, TimeEntryType } from '@coaster/common';
import { describe, expect, it } from 'vitest';
import { DatedMark, formatWorkdayDate, planMark, summariseWorkday, toWorkdayDate } from './workday';

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
  it('should use the bar local date, not the UTC one', () => {
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
});
