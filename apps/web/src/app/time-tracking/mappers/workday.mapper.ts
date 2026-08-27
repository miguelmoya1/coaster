import type { Workday } from '@coaster/common';

const isWorkday = (workday: unknown): workday is Workday =>
  typeof workday === 'object' &&
  workday !== null &&
  'date' in workday &&
  'userId' in workday &&
  'state' in workday &&
  'entries' in workday;

export const workdayArrayMapper = (workdays: unknown): Workday[] => {
  if (!Array.isArray(workdays)) {
    throw new Error('Expected array of Workdays');
  }

  return workdays.map((workday) => {
    if (!isWorkday(workday)) {
      throw new Error('Invalid Workday payload');
    }

    return workday;
  });
};
