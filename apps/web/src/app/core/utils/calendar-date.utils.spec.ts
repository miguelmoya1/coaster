import { afterEach, describe, expect, it, vi } from 'vitest';
import { calendarDateOf, dateOfCalendarDate, shiftCalendarDate, todayCalendarDate } from './calendar-date.utils';

describe('calendar dates', () => {
  afterEach(() => vi.useRealTimers());

  it('should name the day the clock shows, not the one in UTC', () => {
    expect(calendarDateOf(new Date(2026, 8, 25))).toBe('2026-09-25');
    expect(calendarDateOf(new Date(2026, 8, 25, 23, 59))).toBe('2026-09-25');
  });

  it('should read a day back as its local midnight', () => {
    const date = dateOfCalendarDate('2026-09-05');

    expect([date.getFullYear(), date.getMonth(), date.getDate(), date.getHours()]).toEqual([2026, 8, 5, 0]);
  });

  it('should move across months, years and clock changes', () => {
    expect(shiftCalendarDate('2026-10-01', -1)).toBe('2026-09-30');
    expect(shiftCalendarDate('2026-12-31', 1)).toBe('2027-01-01');
    expect(shiftCalendarDate('2026-10-25', 1)).toBe('2026-10-26');
    expect(shiftCalendarDate('2026-03-29', -1)).toBe('2026-03-28');
  });

  it('should tell today from the local clock', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 8, 30, 0, 30));

    expect(todayCalendarDate()).toBe('2026-09-30');
  });
});
