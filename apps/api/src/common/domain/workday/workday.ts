import { ClockState, TimeEntryType } from '../../constants/time-entry.type';
import { ESTABLISHMENT_TIME_ZONE } from '../../constants/time-zone.type';

const TRANSITIONS: Record<ClockState, Partial<Record<TimeEntryType, ClockState>>> = {
  [ClockState.OUT]: { [TimeEntryType.CLOCK_IN]: ClockState.IN },
  [ClockState.IN]: { [TimeEntryType.BREAK_START]: ClockState.ON_BREAK, [TimeEntryType.CLOCK_OUT]: ClockState.OUT },
  [ClockState.ON_BREAK]: { [TimeEntryType.BREAK_END]: ClockState.IN, [TimeEntryType.CLOCK_OUT]: ClockState.OUT },
};

export const nextClockState = (state: ClockState, type: TimeEntryType): ClockState | null =>
  TRANSITIONS[state][type] ?? null;

export const replayClockState = (types: TimeEntryType[]): ClockState | null =>
  types.reduce<ClockState | null>(
    (state, type) => (state === null ? null : nextClockState(state, type)),
    ClockState.OUT,
  );

export const isOpen = (state: ClockState | null): boolean => state !== null && state !== ClockState.OUT;

const ISO_DATE_IN_ESTABLISHMENT_TIME_ZONE = new Intl.DateTimeFormat('en-CA', { timeZone: ESTABLISHMENT_TIME_ZONE });

export const workdayDateOf = (instant: Date): string => ISO_DATE_IN_ESTABLISHMENT_TIME_ZONE.format(instant);
