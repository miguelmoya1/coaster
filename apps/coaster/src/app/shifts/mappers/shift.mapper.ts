import { Shift } from '@coaster/interfaces';

export const checkIsShift = (shift: unknown): shift is Shift => {
  return typeof shift === 'object' && shift !== null && 'id' in shift && 'startTime' in shift && 'endTime' in shift;
};

export const shiftMapper = (shift: unknown): Shift => {
  if (!checkIsShift(shift)) {
    throw new Error('Invalid Shift payload');
  }
  return { ...shift };
};

export const shiftArrayMapper = (shifts: unknown): Shift[] => {
  if (!Array.isArray(shifts)) throw new Error('Expected array of Shifts');
  return shifts.map(shiftMapper);
};
