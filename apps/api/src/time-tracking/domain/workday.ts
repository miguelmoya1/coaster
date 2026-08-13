import type { TimeEntry } from '@coaster/common';
import { ESTABLISHMENT_TIME_ZONE, ClockState, TimeEntryType, WorkdayDiscrepancy } from '@coaster/common';

export interface ClockMark {
  type: TimeEntryType;
  occurredAt: Date;
}

export interface WorkdayTotals {
  state: ClockState;
  workedMinutes: number;
  breakMinutes: number;
}

const TRANSITIONS: Record<ClockState, Partial<Record<TimeEntryType, ClockState>>> = {
  [ClockState.OUT]: { [TimeEntryType.CLOCK_IN]: ClockState.IN },
  [ClockState.IN]: { [TimeEntryType.BREAK_START]: ClockState.ON_BREAK, [TimeEntryType.CLOCK_OUT]: ClockState.OUT },
  [ClockState.ON_BREAK]: { [TimeEntryType.BREAK_END]: ClockState.IN, [TimeEntryType.CLOCK_OUT]: ClockState.OUT },
};

export const nextClockState = (state: ClockState, type: TimeEntryType): ClockState | null =>
  TRANSITIONS[state][type] ?? null;

const byOccurredAt = (a: ClockMark, b: ClockMark) => a.occurredAt.getTime() - b.occurredAt.getTime();

export const summariseWorkday = (marks: ClockMark[], now: Date): WorkdayTotals | null => {
  const sorted = [...marks].sort(byOccurredAt);

  let state: ClockState = ClockState.OUT;
  let since: Date | null = null;
  let workedMs = 0;
  let breakMs = 0;

  for (const mark of sorted) {
    const next = nextClockState(state, mark.type);

    if (!next) {
      return null;
    }

    if (since) {
      const elapsed = mark.occurredAt.getTime() - since.getTime();

      if (state === ClockState.IN) {
        workedMs += elapsed;
      } else if (state === ClockState.ON_BREAK) {
        breakMs += elapsed;
      }
    }

    state = next;
    since = mark.occurredAt;
  }

  if (since && state !== ClockState.OUT) {
    const elapsed = Math.max(0, now.getTime() - since.getTime());

    if (state === ClockState.IN) {
      workedMs += elapsed;
    } else {
      breakMs += elapsed;
    }
  }

  return {
    state,
    workedMinutes: Math.round(workedMs / 60_000),
    breakMinutes: Math.round(breakMs / 60_000),
  };
};

export const replayClockState = (marks: ClockMark[]): ClockState | null =>
  summariseWorkday(marks, new Date())?.state ?? null;

export const toWorkdayDate = (instant: Date): Date => {
  const local = Temporal.Instant.fromEpochMilliseconds(instant.getTime()).toZonedDateTimeISO(ESTABLISHMENT_TIME_ZONE);
  return new Date(Date.UTC(local.year, local.month - 1, local.day));
};

export const formatWorkdayDate = (date: Date): string => date.toISOString().slice(0, 10);

export const parseWorkdayDate = (date: string): Date => new Date(`${date}T00:00:00.000Z`);

export const shiftWorkdayDate = (date: Date, days: number): Date =>
  new Date(date.getTime() + days * 24 * 60 * 60 * 1000);

export interface DatedMark extends ClockMark {
  workdayDate: string;
}

const isDayOpen = (marks: ClockMark[]): boolean => {
  const state = replayClockState(marks);
  return state !== null && state !== ClockState.OUT;
};

export const planMark = (type: TimeEntryType, occurredAt: Date, day: DatedMark[]): Date | null => {
  const natural = toWorkdayDate(occurredAt);
  const previous = shiftWorkdayDate(natural, -1);
  const previousMarks = day.filter((mark) => mark.workdayDate === formatWorkdayDate(previous));

  const inheritsPreviousDay =
    isDayOpen(previousMarks) && previousMarks.every((mark) => mark.occurredAt.getTime() <= occurredAt.getTime());
  const workdayDate = inheritsPreviousDay ? previous : natural;
  const marks = day.filter((mark) => mark.workdayDate === formatWorkdayDate(workdayDate));

  return replayClockState([...marks, { type, occurredAt }]) ? workdayDate : null;
};

export const toDatedMarks = (entries: TimeEntry[]): DatedMark[] =>
  entries
    .filter((entry) => !entry.voided)
    .map((entry) => ({
      type: entry.type,
      occurredAt: new Date(entry.occurredAt),
      workdayDate: entry.workdayDate,
    }));

export interface PlannedShift {
  startsAt: Date;
  endsAt: Date;
  minutes: number;
}

const TOLERANCE_MINUTES = 10;

const minutesBetween = (from: Date, to: Date): number => (to.getTime() - from.getTime()) / 60_000;

export const findDiscrepancies = (
  marks: DatedMark[],
  planned: PlannedShift | null,
  workedMinutes: number,
): WorkdayDiscrepancy[] => {
  const worked = [...marks].sort(byOccurredAt);
  const found: WorkdayDiscrepancy[] = [];

  if (!planned) {
    return worked.length > 0 ? [WorkdayDiscrepancy.UNPLANNED] : [];
  }

  if (worked.length === 0) {
    return [WorkdayDiscrepancy.NO_SHOW];
  }

  if (minutesBetween(planned.startsAt, worked[0].occurredAt) > TOLERANCE_MINUTES) {
    found.push(WorkdayDiscrepancy.LATE_START);
  }

  const lastOut = [...worked].reverse().find((mark) => mark.type === TimeEntryType.CLOCK_OUT);

  if (lastOut && minutesBetween(lastOut.occurredAt, planned.endsAt) > TOLERANCE_MINUTES) {
    found.push(WorkdayDiscrepancy.EARLY_FINISH);
  }

  if (workedMinutes - planned.minutes > TOLERANCE_MINUTES) {
    found.push(WorkdayDiscrepancy.OVERTIME);
  }

  return found;
};
