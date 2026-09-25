import type { Workday } from '@coaster/common';
import { ClockState } from '@coaster/common';

export const clockStateOf = (current: Workday | null | undefined): ClockState => current?.state ?? ClockState.OUT;

export const workdayOn = (workdays: Workday[], day: string): Workday | undefined =>
  workdays.find((workday) => workday.date === day);
