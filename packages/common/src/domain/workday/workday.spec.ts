import { describe, expect, it } from 'vitest';
import { ClockState, TimeEntryType } from '../../constants/time-entry.type';
import { isOpen, nextClockState, replayClockState, workdayDateOf } from './workday';

describe('nextClockState', () => {
  it('should let a shift run in, out for a break, back and home', () => {
    expect(nextClockState(ClockState.OUT, TimeEntryType.CLOCK_IN)).toBe(ClockState.IN);
    expect(nextClockState(ClockState.IN, TimeEntryType.BREAK_START)).toBe(ClockState.ON_BREAK);
    expect(nextClockState(ClockState.ON_BREAK, TimeEntryType.BREAK_END)).toBe(ClockState.IN);
    expect(nextClockState(ClockState.IN, TimeEntryType.CLOCK_OUT)).toBe(ClockState.OUT);
  });

  it('should let the worker go home straight from a break', () => {
    expect(nextClockState(ClockState.ON_BREAK, TimeEntryType.CLOCK_OUT)).toBe(ClockState.OUT);
  });

  it('should refuse a punch that makes no sense where the shift is', () => {
    expect(nextClockState(ClockState.OUT, TimeEntryType.CLOCK_OUT)).toBe(null);
    expect(nextClockState(ClockState.OUT, TimeEntryType.BREAK_START)).toBe(null);
    expect(nextClockState(ClockState.IN, TimeEntryType.CLOCK_IN)).toBe(null);
    expect(nextClockState(ClockState.ON_BREAK, TimeEntryType.BREAK_START)).toBe(null);
  });
});

describe('replayClockState', () => {
  it('should start out with nothing punched', () => {
    expect(replayClockState([])).toBe(ClockState.OUT);
  });

  it('should land on the state the punches add up to', () => {
    const day = [
      TimeEntryType.CLOCK_IN,
      TimeEntryType.BREAK_START,
      TimeEntryType.BREAK_END,
      TimeEntryType.CLOCK_OUT,
    ];

    expect(replayClockState(day)).toBe(ClockState.OUT);
  });

  it('should report a day that never got its closing punch as still running', () => {
    expect(replayClockState([TimeEntryType.CLOCK_IN])).toBe(ClockState.IN);
    expect(replayClockState([TimeEntryType.CLOCK_IN, TimeEntryType.BREAK_START])).toBe(ClockState.ON_BREAK);
  });

  it('should reject the whole day as soon as one punch does not fit', () => {
    expect(replayClockState([TimeEntryType.CLOCK_IN, TimeEntryType.CLOCK_IN])).toBe(null);
    expect(replayClockState([TimeEntryType.BREAK_END])).toBe(null);
  });
});

describe('isOpen', () => {
  it('should call a day open while the worker is on it, break included', () => {
    expect(isOpen(ClockState.IN)).toBe(true);
    expect(isOpen(ClockState.ON_BREAK)).toBe(true);
  });

  it('should call anything else closed', () => {
    expect(isOpen(ClockState.OUT)).toBe(false);
    expect(isOpen(null)).toBe(false);
  });
});

describe('workdayDateOf', () => {
  it('should read the date the establishment is on, not the UTC one', () => {
    expect(workdayDateOf(new Date('2026-08-08T23:30:00Z'))).toBe('2026-08-09');
    expect(workdayDateOf(new Date('2026-08-08T12:00:00Z'))).toBe('2026-08-08');
  });

  it('should stay on the day that is ending through the small hours', () => {
    expect(workdayDateOf(new Date('2026-08-09T01:00:00Z'))).toBe('2026-08-09');
  });
});
