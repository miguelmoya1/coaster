import type { Workday } from '../models/time-entry.interface';
import { ClockState } from '../models/time-entry.type';

export const clockStateOf = (current: Workday | null | undefined): ClockState => current?.state ?? ClockState.OUT;

export const workdayOn = (workdays: Workday[], day: string): Workday | undefined =>
  workdays.find((workday) => workday.date === day);
