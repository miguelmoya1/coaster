export const TimeEntryType = {
  CLOCK_IN: 'CLOCK_IN',
  BREAK_START: 'BREAK_START',
  BREAK_END: 'BREAK_END',
  CLOCK_OUT: 'CLOCK_OUT',
} as const;

export type TimeEntryType = (typeof TimeEntryType)[keyof typeof TimeEntryType];

export const TimeEntryAction = {
  RECORDED: 'RECORDED',
  AMENDED: 'AMENDED',
  VOIDED: 'VOIDED',
} as const;

export type TimeEntryAction = (typeof TimeEntryAction)[keyof typeof TimeEntryAction];

export const TimeEntrySource = {
  EMPLOYEE_DEVICE: 'EMPLOYEE_DEVICE',
  MANUAL: 'MANUAL',
} as const;

export type TimeEntrySource = (typeof TimeEntrySource)[keyof typeof TimeEntrySource];

export const ClockState = {
  OUT: 'OUT',
  IN: 'IN',
  ON_BREAK: 'ON_BREAK',
} as const;

export type ClockState = (typeof ClockState)[keyof typeof ClockState];

export const WorkdayDiscrepancy = {
  NO_SHOW: 'NO_SHOW',
  UNPLANNED: 'UNPLANNED',
  LATE_START: 'LATE_START',
  EARLY_FINISH: 'EARLY_FINISH',
  OVERTIME: 'OVERTIME',
} as const;

export type WorkdayDiscrepancy = (typeof WorkdayDiscrepancy)[keyof typeof WorkdayDiscrepancy];
