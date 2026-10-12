import { describe, expect, it } from 'vitest';
import { dayRangeOf, scheduleDateOf, scheduleViewOf, shiftsRangeOf, timeSheetRangeOf } from './schedule-range';

describe('schedule range', () => {
  const wednesday = new Date(2026, 7, 12, 15, 30);

  it('should ask for shifts of the whole week in day and week view, and of the month in month view', () => {
    const week = shiftsRangeOf(wednesday, 'week');
    expect(new Date(week.startIso)).toEqual(new Date(2026, 7, 10, 0, 0, 0, 0));
    expect(new Date(week.endIso)).toEqual(new Date(2026, 7, 16, 23, 59, 59, 999));
    expect(shiftsRangeOf(wednesday, 'day')).toEqual(week);

    const month = shiftsRangeOf(wednesday, 'month');
    expect(new Date(month.startIso)).toEqual(new Date(2026, 7, 1, 0, 0, 0, 0));
    expect(new Date(month.endIso)).toEqual(new Date(2026, 7, 31, 23, 59, 59, 999));
  });

  it('should cover a single day from its first to its last millisecond', () => {
    const day = dayRangeOf(wednesday);

    expect(new Date(day.startIso)).toEqual(new Date(2026, 7, 12, 0, 0, 0, 0));
    expect(new Date(day.endIso)).toEqual(new Date(2026, 7, 12, 23, 59, 59, 999));
  });

  it('should cover the day, the week or the month on screen for the timesheet', () => {
    expect(timeSheetRangeOf(wednesday, 'day')).toEqual({ from: '2026-08-12', to: '2026-08-12' });
    expect(timeSheetRangeOf(wednesday, 'week')).toEqual({ from: '2026-08-10', to: '2026-08-16' });
    expect(timeSheetRangeOf(wednesday, 'month')).toEqual({ from: '2026-08-01', to: '2026-08-31' });
  });

  it('should read the URL, falling back to today and the day view on anything it does not understand', () => {
    expect(scheduleDateOf('2026-08-12').getFullYear()).toBe(2026);
    expect(scheduleDateOf('not-a-date').toDateString()).toBe(new Date().toDateString());
    expect(scheduleViewOf('month')).toBe('month');
    expect(scheduleViewOf('year')).toBe('day');
    expect(scheduleViewOf(undefined)).toBe('day');
  });
});
